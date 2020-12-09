use std::convert::Infallible;

use serde::de::DeserializeOwned;
use warp::Filter;

use crate::{db::PgPool, handlers::*};

/// The 4 TODOs filters combined.
pub fn routes(
    pool: PgPool,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    let rooms = rooms_get(pool.clone()).or(rooms_post(pool.clone()));

    let users = users_post(pool.clone());

    let routes = rooms.or(users);
    routes
}

/// GET /rooms?offset=3&limit=5
pub fn rooms_get(
    pool: PgPool,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path!("rooms")
        .and(warp::get())
        .and(warp::query::<ListOptions>())
        .and(with_db(pool))
        .and_then(list_rooms)
}

/// POST /rooms with JSON body
pub fn rooms_post(
    pool: PgPool,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path!("rooms")
        .and(warp::post())
        .and(json_body::<RoomCreateReq>())
        .and(with_db(pool))
        .and_then(create_room)
}

/// POST /users with JSON body
pub fn users_post(
    pool: PgPool,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path!("users")
        .and(warp::post())
        .and(json_body::<UserCreateReq>())
        .and(with_db(pool))
        .and_then(create_user)
}

// fn get_conn(pool: PgPool) -> impl Filter<Extract = (PooledPg,), Error = warp::Rejection> + Clone {
//     warp::any()
//         .map(move || pool.clone())
//         .map(|pool: PgPool| async move {
//             match pool.get() {
//                 Ok(conn) => Ok(conn),
//                 Err(_) => {
//                     error!("Unable to start maintain connection");
//                     Err(reject::custom(errors::DatabaseError))
//                 }
//             }
//         })
// }

fn with_db(pool: PgPool) -> impl Filter<Extract = (PgPool,), Error = Infallible> + Clone {
    warp::any().map(move || pool.clone())
}

fn json_body<T>() -> impl Filter<Extract = (T,), Error = warp::Rejection> + Clone
where
    T: Send + DeserializeOwned,
{
    // When accepting a body, we want a JSON body
    // (and to reject huge payloads)...
    warp::body::content_length_limit(1024 * 16).and(warp::body::json())
}
