use std::num::TryFromIntError;

use serde::Serialize;

use warp::{
    hyper::StatusCode,
    reject::{self, Reject},
    Rejection, Reply,
};

#[derive(Debug)]
pub enum MyError {
    UnexpectedError,
    DBConnectionError,
    AuthError(String),
    DBError(diesel::result::Error),
}

impl From<diesel::result::Error> for MyError {
    fn from(e: diesel::result::Error) -> Self {
        MyError::DBError(e)
    }
}

impl From<TryFromIntError> for MyError {
    fn from(e: TryFromIntError) -> Self {
        error!("{:#?}", e);
        MyError::UnexpectedError
    }
}

impl Reject for MyError {}

impl From<MyError> for Rejection {
    fn from(e: MyError) -> Self {
        reject::custom(e)
    }
}

#[derive(Debug, Serialize)]
struct ErrorMessage {
    code: u16,
    message: String,
}

pub async fn handle_error(err: Rejection) -> Result<impl Reply, Rejection> {
    let code;
    let message;
    if err.is_not_found() {
        code = StatusCode::NOT_FOUND;
        message = "Resource not found".to_string();
    } else if let Some(e) = err.find::<warp::filters::body::BodyDeserializeError>() {
        code = StatusCode::BAD_REQUEST;
        message = e.to_string();
    } else if let Some(my_err) = err.find::<MyError>() {
        match my_err {
            MyError::UnexpectedError => {
                error!("{:#?}", my_err);
                code = StatusCode::INTERNAL_SERVER_ERROR;
                message = "Unexpected error.".to_string();
            }
            MyError::AuthError(msg) => {
                code = StatusCode::FORBIDDEN;
                message = msg.clone();
            }
            MyError::DBConnectionError => {
                error!("{:#?}", my_err);
                code = StatusCode::INTERNAL_SERVER_ERROR;
                message = "Database is likely busy. Try again later.".to_string();
            }
            MyError::DBError(db_err) => match db_err {
                diesel::result::Error::InvalidCString(_) => {
                    code = StatusCode::BAD_REQUEST;
                    message =
                        "Something happened with your request. Don't be doing anything bad now."
                            .to_string();
                }
                diesel::result::Error::DatabaseError(kind, info) => match kind {
                    diesel::result::DatabaseErrorKind::UniqueViolation => {
                        code = StatusCode::BAD_REQUEST;
                        message = info.message().to_string();
                    }
                    diesel::result::DatabaseErrorKind::ForeignKeyViolation => {
                        code = StatusCode::BAD_REQUEST;
                        message = info.message().to_string();
                    }
                    _ => {
                        error!("{:#?}", my_err);
                        code = StatusCode::INTERNAL_SERVER_ERROR;
                        message = "Unknown database error. Try again later.".to_string();
                    }
                },
                _ => {
                    error!("{:#?}", my_err);
                    code = StatusCode::INTERNAL_SERVER_ERROR;
                    message = "Unknown database error. Try again later.".to_string();
                }
            },
        }
    } else {
        error!("{:#?}", err);
        return Err(err);
    }

    let json = warp::reply::json(&ErrorMessage {
        code: code.as_u16(),
        message: message.into(),
    });
    Ok(warp::reply::with_status(json, code))
}
