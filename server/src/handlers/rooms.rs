use chrono::{DateTime, Utc};
use diesel::{delete, dsl::any, insert_into, prelude::*};
use futures::stream::{self, StreamExt};
use serde::{Deserialize, Serialize, Serializer};
use uuid::Uuid;
use warp::{
    hyper::StatusCode,
    reject,
    reply::{json, with_status},
};

use std::{cmp::min, collections::HashMap};

use crate::schema;
use crate::schema::{rooms::dsl::*, users::dsl::*};
use crate::{
    db::{PgPool, Room},
    errors::MyError,
};

use super::{util::db_txn, HostConnections};

#[derive(Debug, Deserialize)]
pub struct ListOptions {
    pub offset: Option<u8>,
    pub limit: Option<u8>,
}

#[derive(Debug)]
#[repr(i16)]
pub enum HostStatus {
    Unknown = 0,
    Stopped = 1,
    Playing = 2,
}

impl Serialize for HostStatus {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(match self {
            HostStatus::Unknown => "unknown",
            HostStatus::Playing => "playing",
            HostStatus::Stopped => "stopped",
        })
    }
}

impl From<i16> for HostStatus {
    fn from(i: i16) -> Self {
        match i {
            x if x == HostStatus::Unknown as i16 => HostStatus::Unknown,
            x if x == HostStatus::Playing as i16 => HostStatus::Playing,
            x if x == HostStatus::Stopped as i16 => HostStatus::Stopped,
            x => {
                error!("attempting to convert invalid i16 to HostStatus: {}", x);
                HostStatus::Unknown
            }
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct RoomCreateReq {
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct RoomResponse {
    pub id: Uuid,
    pub name: String,
    pub host_name: Option<String>,
    pub host_status: HostStatus,
    pub created_at: DateTime<Utc>,
    pub last_connected: Option<DateTime<Utc>>,
}

#[derive(Debug, Queryable)]
pub struct UserDisplayName {
    pub id: Uuid,
    pub display_name: String,
}

const ROOM_LIMIT_MAX: u8 = 100;

pub async fn get_host_status(host_conns: &HostConnections, room: &Uuid) -> HostStatus {
    if host_conns.read().await.contains_key(room) {
        HostStatus::Playing
    } else {
        HostStatus::Stopped
    }
}

pub async fn list_rooms(
    opts: ListOptions,
    pool: PgPool,
    host_conns: HostConnections,
) -> Result<impl warp::Reply, warp::Rejection> {
    let offset_or_zero = opts.offset.unwrap_or(0);
    let limit = min(opts.limit.unwrap_or(ROOM_LIMIT_MAX), ROOM_LIMIT_MAX);
    let offset = offset_or_zero;
    let rooms_to_ret = db_txn(pool, true, |db| {
        let found_rooms = rooms
            .offset(i64::from(offset))
            .limit(i64::from(limit))
            .load::<Room>(db)?;
        let ids: Vec<Uuid> = found_rooms
            .iter()
            .map(|room| room.user_id.clone())
            .collect();
        let found_users = users
            .select((schema::users::dsl::id, display_name))
            .filter(schema::users::dsl::id.eq(any(&ids)))
            .load::<UserDisplayName>(db)?;
        Ok((found_rooms, found_users))
    })
    .await;
    match rooms_to_ret {
        Err(e) => Err(reject::custom(e)),
        Ok((found_rooms, found_users)) => {
            let id_to_name: HashMap<Uuid, String> = found_users
                .into_iter()
                .map(|u| (u.id, u.display_name))
                .collect();
            let response: Vec<RoomResponse> = stream::iter(found_rooms.into_iter())
                .then(|room| async {
                    let host_status = get_host_status(&host_conns, &room.id).await;
                    RoomResponse {
                        id: room.id,
                        host_name: id_to_name
                            .get(&room.user_id)
                            .map_or(None, |name| Some(name.clone())),
                        name: room.room_name,
                        host_status,
                        created_at: room.created_at,
                        last_connected: room.last_connected,
                    }
                })
                .collect()
                .await;
            Ok(json(&response))
        }
    }
}

pub async fn create_room(
    pool: PgPool,
    req_user_id: Uuid,
    create: RoomCreateReq,
) -> Result<impl warp::Reply, warp::Rejection> {
    let to_create = Room {
        id: Uuid::new_v4(),
        room_name: create.name,
        user_id: req_user_id,
        created_at: Utc::now(),
        last_connected: None,
    };

    let res = db_txn(pool, false, |db| {
        let insert_result = insert_into(rooms).values(&to_create).execute(db)?;
        if insert_result == 0 {
            return Err(MyError::UnexpectedError);
        }
        let read_result: Room = rooms.find(to_create.id).first(db)?;
        Ok(read_result)
    })
    .await;

    match res {
        Err(e) => Err(reject::custom(e)),
        Ok(room) => Ok(with_status(json(&room), StatusCode::CREATED)),
    }
}

pub async fn delete_room(
    room_to_delete: Uuid,
    pool: PgPool,
    req_user_id: Uuid,
) -> Result<impl warp::Reply, warp::Rejection> {
    let res = db_txn(pool, false, |db| {
        let room_result: Room = rooms.find(room_to_delete).first(db)?;
        if room_result.user_id != req_user_id {
            return Err(MyError::AuthError(
                "Unable to delete: room is not owned by user".to_owned(),
            ));
        }
        delete(rooms.find(room_to_delete)).execute(db)?;
        Ok(())
    })
    .await;

    match res {
        Err(e) => Err(reject::custom(e)),
        Ok(_) => Ok(StatusCode::NO_CONTENT),
    }
}

pub async fn list_rooms_for_user(
    for_user_id: Uuid,
    pool: PgPool,
    host_conns: HostConnections,
) -> Result<impl warp::Reply, warp::Rejection> {
    let rooms_to_ret = db_txn(pool, true, |db| {
        let found_rooms = rooms.filter(user_id.eq(for_user_id)).load::<Room>(db)?;
        let user_name: UserDisplayName = users
            .select((schema::users::dsl::id, display_name))
            .filter(schema::users::dsl::id.eq(for_user_id))
            .first(db)?;
        Ok((found_rooms, user_name))
    })
    .await;
    match rooms_to_ret {
        Err(e) => Err(reject::custom(e)),
        Ok((found_rooms, user_name)) => {
            let response: Vec<RoomResponse> = stream::iter(found_rooms)
                .then(|room| async {
                    let host_status = get_host_status(&host_conns, &room.id).await;
                    RoomResponse {
                        id: room.id,
                        host_name: Some(user_name.display_name.clone()),
                        name: room.room_name,
                        host_status,
                        created_at: room.created_at,
                        last_connected: room.last_connected,
                    }
                })
                .collect()
                .await;
            Ok(json(&response))
        }
    }
}
