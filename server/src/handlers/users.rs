use chrono::Utc;
use crypto::bcrypt::bcrypt;
use diesel::{insert_into, prelude::*};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use warp::{
    hyper::StatusCode,
    reply::{json, with_status},
};

use crate::{
    auth::{gen_salt, get_token},
    db::{PgPool, User, UserQueryResult},
    errors::MyError,
    schema::users::dsl::*,
    settings::{BCRYPT_COST, OUTPUT_LEN},
};

use super::util::db_txn;

#[derive(Deserialize)]
pub struct UserCreateReq {
    pub display_name: String,
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct UserLoginReq {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct UserLoginRes {
    pub result: UserQueryResult,
    pub token: String,
}

pub async fn create_user(
    create: UserCreateReq,
    pool: PgPool,
) -> Result<impl warp::Reply, warp::Rejection> {
    let gen_salt = gen_salt();
    let mut pass_output = [0u8; OUTPUT_LEN];
    bcrypt(
        BCRYPT_COST,
        &gen_salt,
        create.password.as_bytes(),
        &mut pass_output,
    );
    let to_create = User {
        id: Uuid::new_v4(),
        display_name: create.display_name,
        email: create.email,
        created_at: Utc::now(),
        pass_hash: Vec::from(pass_output),
        salt: Vec::from(gen_salt),
    };

    let user = db_txn(pool, false, |db| {
        let insert_result = insert_into(users).values(&to_create).execute(db)?;
        if insert_result == 0 {
            return Err(MyError::UnexpectedError);
        }
        let read_result: UserQueryResult = users
            .select((id, display_name, email, created_at))
            .find(to_create.id)
            .first(db)?;
        Ok(read_result)
    })
    .await?;

    Ok(with_status(
        json(&UserLoginRes {
            token: get_token(&user.id)?,
            result: user,
        }),
        StatusCode::CREATED,
    ))
}

pub async fn login_user(
    login: UserLoginReq,
    pool: PgPool,
) -> Result<impl warp::Reply, warp::Rejection> {
    let res = db_txn(pool, true, |db| -> Result<User, MyError> {
        let user_result: User = users.filter(email.eq(&login.email)).first(db)?;
        Ok(user_result)
    })
    .await;

    let mut pass_output = [0u8; OUTPUT_LEN];
    // ensure (close to) constant time to prevent distinguishing btwn invalid email vs. password
    match res {
        Err(e) => {
            let gen_salt = gen_salt();
            bcrypt(
                BCRYPT_COST,
                &gen_salt,
                login.password.as_bytes(),
                &mut pass_output,
            );
            error!("{:#?}", e);
            Err(warp::Rejection::from(MyError::AuthError(
                "email or password does not match".to_owned(),
            )))
        }
        Ok(user) => {
            bcrypt(
                BCRYPT_COST,
                &user.salt,
                login.password.as_bytes(),
                &mut pass_output,
            );
            if user.pass_hash == pass_output {
                Ok(with_status(
                    json(&UserLoginRes {
                        token: get_token(&user.id)?,
                        result: UserQueryResult::from(user),
                    }),
                    StatusCode::OK,
                ))
            } else {
                Err(warp::Rejection::from(MyError::AuthError(
                    "email or password does not match".to_owned(),
                )))
            }
        }
    }
}
