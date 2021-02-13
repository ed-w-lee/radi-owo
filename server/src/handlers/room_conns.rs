use std::{collections::HashMap, sync::Arc};

use chrono::Utc;
use diesel::prelude::*;
use futures::{FutureExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::{
    sync::{mpsc, RwLock},
    task,
};
use uuid::Uuid;
use warp::{
    ws::{Message, WebSocket, Ws},
    Rejection,
};

use crate::{db::PgPool, errors::MyError, settings::BUF_SIZE};
use crate::{db::Room, schema::rooms::dsl::*};

use super::util::db_txn;

// Room UUID -> Sender to host
pub type HostConnections = Arc<RwLock<HashMap<Uuid, mpsc::Sender<Result<Message, warp::Error>>>>>;

// Room UUID -> Random connection UUID -> (Sender to listener)
pub type ListenConnections =
    Arc<RwLock<HashMap<Uuid, HashMap<Uuid, mpsc::Sender<Result<Message, warp::Error>>>>>>;

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum FromHostMessage {
    ToListener(ToListenerMessage),
    KeepAlive,
}

#[derive(Debug, Deserialize)]
struct ToListenerMessage {
    to: Uuid,
    msg: String,
}

#[derive(Debug, Serialize)]
struct ToHostMessage {
    from: Uuid,
    msg: String,
}

pub async fn host_room(
    room_id: Uuid,
    host_id: Uuid,
    ws: Ws,
    pool: PgPool,
    conns: (HostConnections, ListenConnections),
) -> Result<impl warp::Reply, warp::Rejection> {
    // validate room is owned by host
    let res = db_txn(pool.clone(), true, |db| {
        let room_result: Room = rooms.find(room_id).first(db)?;
        Ok(room_result.user_id)
    })
    .await?;

    let (host_conns, listen_conns) = conns;
    if res != host_id {
        Err(Rejection::from(MyError::AuthError(
            "You are not the owner of the selected room".to_owned(),
        )))
    } else if host_conns.read().await.contains_key(&room_id) {
        // So a ton of connection requests doesn't constantly reset connections
        debug!("Old connection exists");
        Err(Rejection::from(MyError::WSConnectionAlreadyExists))
    } else {
        Ok(ws.on_upgrade(move |socket| {
            host_connected(socket, host_conns, listen_conns, pool, room_id)
        }))
    }
}

async fn host_connected(
    ws: WebSocket,
    host_conns: HostConnections,
    listen_conns: ListenConnections,
    pool: PgPool,
    room_id: Uuid,
) {
    let (ws_writer, mut ws_reader) = ws.split();
    let (buf_write, buf_read) = mpsc::channel(BUF_SIZE);
    task::spawn(buf_read.forward(ws_writer).map(|result| {
        if let Err(e) = result {
            error!("websocket send error: {}", e);
        } else {
            debug!("finished flushing host sender");
        }
    }));

    host_conns.write().await.insert(room_id, buf_write);
    listen_conns
        .write()
        .await
        .insert(room_id, HashMap::default());

    // when host sends message, we need to direct it to the correct listener
    while let Some(result) = ws_reader.next().await {
        let msg = match result {
            Ok(msg) => msg,
            Err(e) => {
                error!("websocket receive error (uid={}): {}", room_id, e);
                break;
            }
        };
        handle_host_message(&listen_conns, pool.clone(), room_id, msg).await;
    }

    // host disconnected
    listen_conns.write().await.remove(&room_id);
    host_conns.write().await.remove(&room_id);
}

async fn handle_host_message(
    listen_conns: &ListenConnections,
    pool: PgPool,
    room_id: Uuid,
    msg: Message,
) {
    let raw_msg = {
        if let Ok(s) = msg.to_str() {
            s
        } else {
            return;
        }
    };

    match serde_json::from_str::<FromHostMessage>(raw_msg) {
        Err(e) => {
            error!("couldn't deserialize msg: {} due to {}", raw_msg, e);
        }
        Ok(msg) => match msg {
            FromHostMessage::KeepAlive => {
                let update_result = db_txn(pool, false, |db| {
                    let updated = diesel::update(rooms.find(room_id))
                        .set(last_connected.eq(Utc::now()))
                        .execute(db)?;
                    Ok(updated == 1)
                })
                .await;
                match update_result {
                    Err(e) => {
                        error!("{:#?}", e);
                    }
                    Ok(updated) if !updated => {
                        error!("couldn't update room {}, likely not present", room_id);
                    }
                    _ => {}
                }
            }
            FromHostMessage::ToListener(to_listener) => {
                let mut listeners = listen_conns.write().await;
                match listeners.get_mut(&room_id) {
                    None => {
                        debug!("room closed: {}", room_id);
                    }
                    Some(room_listeners) => match room_listeners.get_mut(&to_listener.to) {
                        None => {
                            debug!("listener not found: {}, {:#?}", to_listener.to, to_listener);
                        }
                        Some(listener) => {
                            let res = listener.send(Ok(Message::text(to_listener.msg))).await;
                            if let Err(e) = res {
                                error!("unable to send to listener, likely disconnected {}", e);
                            }
                        }
                    },
                }
            }
        },
    }
}

pub async fn listen_room(
    room_id: Uuid,
    ws: Ws,
    pool: PgPool,
    conns: (HostConnections, ListenConnections),
) -> Result<impl warp::Reply, warp::Rejection> {
    // validate room exists
    db_txn(pool, true, |db| {
        let _: Room = rooms.find(room_id).first(db)?;
        Ok(())
    })
    .await?;

    let (host_conns, listen_conns) = conns;
    Ok(ws.on_upgrade(move |socket| listen_connected(socket, host_conns, listen_conns, room_id)))
}

async fn listen_connected(
    ws: WebSocket,
    host_conns: HostConnections,
    listen_conns: ListenConnections,
    room_id: Uuid,
) {
    let (ws_writer, mut ws_reader) = ws.split();
    let (buf_write, buf_read) = mpsc::channel(BUF_SIZE);
    task::spawn(buf_read.forward(ws_writer).map(|result| {
        if let Err(e) = result {
            error!("websocket read error: {}", e);
        } else {
            debug!("finished flushing listener sender");
        }
    }));

    let my_uuid = Uuid::new_v4();
    match listen_conns.write().await.get_mut(&room_id) {
        Some(listeners) => listeners.insert(my_uuid, buf_write),
        None => {
            error!("host probably disconnected");
            return;
        }
    };

    while let Some(result) = ws_reader.next().await {
        let msg = match result {
            Ok(msg) => msg,
            Err(e) => {
                error!(
                    "websocket receive error (listener on room={}): {}",
                    room_id, e
                );
                break;
            }
        };
        if let Err(_) = handle_listen_message(&host_conns, msg, &my_uuid, &room_id).await {
            error!("error while handling listen message");
            break;
        }
    }

    // listener disconnected
    let mut listeners = listen_conns.write().await;
    match listeners.get_mut(&room_id) {
        None => {
            debug!("room closed: {}", room_id);
        }
        Some(room_listeners) => {
            room_listeners.remove(&my_uuid);
            debug!("number of listeners: {}", room_listeners.len());
        }
    }
}

async fn handle_listen_message(
    host_conns: &HostConnections,
    msg: Message,
    from_id: &Uuid,
    room_id: &Uuid,
) -> Result<(), ()> {
    let msg_str = {
        if let Ok(s) = msg.to_str() {
            s
        } else {
            return Err(());
        }
    };

    debug!("received listener message: {} from {}", msg_str, from_id);
    if msg_str.to_string().is_empty() {
        return Ok(());
    }

    let to_send = ToHostMessage {
        from: from_id.clone(),
        msg: msg_str.to_string(),
    };
    let json_to_send = serde_json::to_string(&to_send).map_err(|_| ())?;

    let mut hosts = host_conns.write().await;
    let dest_result = hosts.get_mut(room_id);
    match dest_result {
        None => {
            debug!("host not found: {}", room_id);
            Err(())
        }
        Some(dest) => {
            let res = dest.send(Ok(Message::text(json_to_send))).await;
            if let Err(e) = res {
                error!("unable to send to host, likely disconnected {}", e);
                Err(())
            } else {
                debug!("successfully sent mesage to host");
                Ok(())
            }
        }
    }
}
