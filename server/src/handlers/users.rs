use chrono::Utc;
use diesel::{insert_into, prelude::*};
use serde::Deserialize;
use uuid::Uuid;
use warp::{
    hyper::StatusCode,
    reject,
    reply::{json, with_status},
};

use crate::{
    db::{PgPool, User},
    errors::MyError,
    schema::users::dsl::*,
};

use super::util::db_txn;

#[derive(Debug, Deserialize)]
pub struct UserCreateReq {
    pub display_name: String,
    pub email: String,
}

pub async fn create_user(
    create: UserCreateReq,
    pool: PgPool,
) -> Result<impl warp::Reply, warp::Rejection> {
    let to_create = User {
        id: Uuid::new_v4(),
        display_name: create.display_name,
        email: create.email,
        created_at: Utc::now(),
    };

    let res = db_txn(pool, false, |db| {
        let insert_result = insert_into(users).values(&to_create).execute(db)?;
        if insert_result == 0 {
            return Err(MyError::UnexpectedError);
        }
        let read_result: User = users.find(to_create.id).first(db)?;
        Ok(read_result)
    })
    .await;

    match res {
        Err(e) => Err(reject::custom(e)),
        Ok(room) => Ok(with_status(json(&room), StatusCode::CREATED)),
    }
}
