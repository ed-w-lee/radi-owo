use std::time::{Duration, SystemTime};

use crypto::{hmac::Hmac, mac::Mac, sha1::Sha1};
use serde::Serialize;
use uuid::Uuid;
use warp::{reject, reply::json};

use crate::{
    errors::MyError,
    settings::{TURN_SECRET, TURN_TIMEOUT},
};

#[derive(Debug, Serialize)]
struct TurnCreds {
    username: String,
    password: String,
}

pub async fn get_turn_creds() -> Result<impl warp::Reply, warp::Rejection> {
    let expiration_ts: Duration = match SystemTime::now().duration_since(SystemTime::UNIX_EPOCH) {
        Ok(n) => n + Duration::from_secs(TURN_TIMEOUT),
        Err(_) => {
            return Err(reject::custom(MyError::UnexpectedError));
        }
    };
    // just use a random UUID as the username since we want non-logged-in users to be able to hit the TURN server
    let username = format!("{}:{}", Uuid::new_v4(), expiration_ts.as_secs());
    let mut hmac = Hmac::new(Sha1::new(), TURN_SECRET.as_bytes());
    hmac.input(username.as_bytes());

    let password = base64::encode(hmac.result().code());
    Ok(json(&TurnCreds { username, password }))
}
