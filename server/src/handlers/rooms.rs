use chrono::{DateTime, Utc};
use diesel::{dsl::any, insert_into, prelude::*};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use warp::{
    hyper::StatusCode,
    reject,
    reply::{json, with_status},
};

use std::{cmp::min, collections::HashMap};

use crate::schema::{rooms::dsl::*, users::dsl::*};
use crate::{db::HostStatus, schema};
use crate::{
    db::{PgPool, Room},
    errors::MyError,
};

use super::util::db_txn;

#[derive(Debug, Deserialize)]
pub struct ListOptions {
    pub offset: Option<u8>,
    pub limit: Option<u8>,
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
    pool: PgPool,
    req_user_id: Uuid,
    create: RoomCreateReq,
) -> Result<impl warp::Reply, warp::Rejection> {
    let to_create = Room {
        id: Uuid::new_v4(),
        room_name: create.name,
        user_id: req_user_id,
        host_status: HostStatus::Stopped as i16,
        created_at: Utc::now(),
        last_hosted: None,
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
