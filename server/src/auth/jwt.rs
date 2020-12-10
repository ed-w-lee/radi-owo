use std::convert::TryFrom;

use chrono::{Duration, Utc};
use futures::future;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use warp::{reject, Filter, Rejection};

use crate::{errors::MyError, settings::JWT_SECRET};

#[derive(Debug, Serialize, Deserialize)]
struct AuthClaims {
    exp: usize,           // expiration time
    iat: usize,           // issued at
    nbf: usize,           // not before
    radiowo_userid: Uuid, // namespaced uuid
}

pub fn get_token(user_id: &Uuid) -> Result<String, MyError> {
    let now = Utc::now();
    // 1 week expiration date for all tokens. it's quite long, but we're stateless and token theft will only last for 1 week (hopefully)
    let next_week = now
        .clone()
        .checked_add_signed(Duration::weeks(1))
        .ok_or(MyError::UnexpectedError)?;
    let now_ts = usize::try_from(now.clone().timestamp())?;
    let claims = AuthClaims {
        exp: usize::try_from(next_week.timestamp())?,
        iat: now_ts,
        nbf: now_ts,
        radiowo_userid: user_id.clone(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(JWT_SECRET.as_bytes()),
    )
    .map_err(|e| -> MyError {
        error!("{:#?}", e);
        MyError::UnexpectedError
    })
}

pub fn for_authorized() -> impl Filter<Extract = (Uuid,), Error = Rejection> + Clone {
    warp::header::<String>("authorization").and_then(|token: String| {
        let mut iter = token.split_ascii_whitespace();
        match iter.next() {
            Some(s) if s.to_ascii_lowercase() == "bearer" => (),
            _ => {
                return future::err(reject::custom(MyError::AuthError(
                    "authorization header missing value".to_owned(),
                )));
            }
        };
        let token = match iter.next() {
            None => {
                return future::err(reject::custom(MyError::AuthError(
                    "authorization header not bearer".to_owned(),
                )));
            }
            Some(token) => token,
        };
        let token_data = decode::<AuthClaims>(
            token,
            &DecodingKey::from_secret(JWT_SECRET.as_bytes()),
            &Validation::default(),
        );
        match token_data {
            Err(e) => {
                error!("{:#?}", e);
                future::err(reject::custom(MyError::AuthError(
                    "unable to decode token".to_owned(),
                )))
            }
            Ok(data) => future::ok(data.claims.radiowo_userid),
        }
    })
}
