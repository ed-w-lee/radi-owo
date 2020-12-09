use chrono::{DateTime, Utc};
use diesel::{dsl::any, insert_into, prelude::*};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use warp::{reject, reply::json};

use std::{cmp::min, collections::HashMap};

use crate::errors::DatabaseError;
use crate::schema::{rooms::dsl::*, users::dsl::*};
use crate::{db::HostStatus, schema};
use crate::{
    db::{PgPool, Room},
    errors::WeirdTokioError,
};

use super::util::wait_for_connection;

#[derive(Debug, Deserialize)]
pub struct ListOptions {
    pub offset: Option<u8>,
    pub limit: Option<u8>,
}

#[derive(Debug, Deserialize)]
pub struct RoomCreateReq {
    pub user_id: Uuid,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct RoomResponse {
    pub id: Uuid,
    pub name: String,
    pub host_name: Option<String>,
    pub host_status: HostStatus,
    pub created_at: DateTime<Utc>,
    pub last_hosted: Option<DateTime<Utc>>,
}

#[derive(Debug, Queryable)]
pub struct UserDisplayName {
    pub id: Uuid,
    pub display_name: String,
}

const ROOM_LIMIT_MAX: u8 = 100;

pub async fn list_rooms(
    opts: ListOptions,
    pool: PgPool,
) -> Result<impl warp::Reply, warp::Rejection> {
    let db = match wait_for_connection(pool).await {
        Err(e) => {
            debug!("{}", e);
            return Err(reject::custom(WeirdTokioError));
        }
        Ok(Err(_)) => {
            debug!("DB connection error");
            return Err(reject::custom(DatabaseError));
        }
        Ok(Ok(conn)) => conn,
    };

    // Just return a JSON array of todos, applying the limit and offset.
    let offset_or_zero = opts.offset.unwrap_or(0);
    let limit = min(opts.limit.unwrap_or(ROOM_LIMIT_MAX), ROOM_LIMIT_MAX);
    let offset = offset_or_zero;
    let rooms_to_ret = db.build_transaction().read_only().deferrable().run(|| {
        let room_result = rooms
            .offset(i64::from(offset))
            .limit(i64::from(limit))
            .load::<Room>(&db);
        if let Err(e) = room_result {
            return Err(e);
        }
        let found_rooms = room_result.unwrap();
        let ids: Vec<Uuid> = found_rooms
            .iter()
            .map(|room| room.user_id.clone())
            .collect();
        let user_result = users
            .select((schema::users::dsl::id, display_name))
            .filter(schema::users::dsl::id.eq(any(&ids)))
            .load::<UserDisplayName>(&db);
        if let Err(e) = user_result {
            return Err(e);
        }
        let found_users = user_result.unwrap();
        Ok((found_rooms, found_users))
    });
    match rooms_to_ret {
        Err(e) => {
            debug!("{}", e);
            Err(reject::custom(DatabaseError))
        }
        Ok((found_rooms, found_users)) => {
            let id_to_name: HashMap<Uuid, String> = found_users
                .into_iter()
                .map(|u| (u.id, u.display_name))
                .collect();
            let response: Vec<RoomResponse> = found_rooms
                .into_iter()
                .map(|room| RoomResponse {
                    id: room.id,
                    host_name: id_to_name
                        .get(&room.user_id)
                        .map_or(None, |name| Some(name.clone())),
                    name: room.room_name,
                    host_status: HostStatus::from(room.host_status),
                    created_at: room.created_at,
                    last_hosted: room.last_hosted,
                })
                .collect();
            Ok(json(&response))
        }
    }
}

pub async fn create_room(
    create: RoomCreateReq,
    pool: PgPool,
) -> Result<impl warp::Reply, warp::Rejection> {
    let db = match wait_for_connection(pool).await {
        Err(e) => {
            debug!("{}", e);
            return Err(reject::custom(WeirdTokioError));
        }
        Ok(Err(_)) => {
            debug!("DB connection error");
            return Err(reject::custom(DatabaseError));
        }
        Ok(Ok(conn)) => conn,
    };

    let to_create = Room {
        id: Uuid::new_v4(),
        room_name: create.name,
        user_id: create.user_id,
        host_status: HostStatus::Stopped as i16,
        created_at: Utc::now(),
        last_hosted: None,
    };

    let res: Result<Room, diesel::result::Error> =
        db.build_transaction().read_write().deferrable().run(|| {
            let insert_result = insert_into(rooms).values(&to_create).execute(&db);
            if let Err(e) = insert_result {
                return Err(e);
            }
            let read_result = rooms.find(to_create.id).first(&db);
            if let Err(e) = read_result {
                return Err(e);
            }
            Ok(read_result.unwrap())
        });

    match res {
        Err(e) => {
            debug!("{}", e);
            Err(reject::custom(DatabaseError))
        }
        Ok(room) => Ok(json(&room)),
    }
}
