use chrono::Utc;
use diesel::{insert_into, prelude::*};
use serde::Deserialize;
use uuid::Uuid;
use warp::{reject, reply::json};

use crate::{
    db::{PgPool, User},
    errors::{DatabaseError, WeirdTokioError},
    schema::users::dsl::*,
};

use super::util::wait_for_connection;

#[derive(Debug, Deserialize)]
pub struct UserCreateReq {
    pub display_name: String,
    pub email: String,
}

pub async fn create_user(
    create: UserCreateReq,
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

    let to_create = User {
        id: Uuid::new_v4(),
        display_name: create.display_name,
        email: create.email,
        created_at: Utc::now(),
    };

    let res: Result<User, diesel::result::Error> =
        db.build_transaction().read_write().deferrable().run(|| {
            let insert_result = insert_into(users).values(&to_create).execute(&db);
            if let Err(e) = insert_result {
                return Err(e);
            }
            let read_result = users.find(to_create.id).first(&db);
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
