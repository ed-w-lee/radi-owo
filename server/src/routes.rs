use std::convert::Infallible;

use serde::de::DeserializeOwned;
use uuid::Uuid;
use warp::Filter;

use crate::{
    auth::{for_authorized, for_authorized_ws},
    db::PgPool,
    handlers::*,
};

// all filters combined
pub fn routes(
    pool: PgPool,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    let rooms = rooms_get(pool.clone())
        .or(rooms_post(pool.clone()))
        .or(rooms_delete(pool.clone()));

    let host_conns = HostConnections::default();
    let listen_conns = ListenConnections::default();
    let room_conns = rooms_host_ws(pool.clone(), host_conns.clone(), listen_conns.clone()).or(
        rooms_listen_ws(pool.clone(), host_conns.clone(), listen_conns.clone()),
    );

    let room_routes = warp::path("rooms").and(room_conns.or(rooms));

    let users = warp::path("users").and(users_post(pool.clone()).or(user_rooms_get(pool.clone())));
    let my_routes =
        warp::path("my").and(my_rooms_get(pool.clone()).or(my_sessions_post(pool.clone())));

    let routes = room_routes.or(users).or(my_routes);
    routes
}

// POST /users with JSON body
pub fn users_post(
    pool: PgPool,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::post()
        .and(json_body::<UserCreateReq>())
        .and(with_db(pool))
        .and_then(create_user)
}

// GET /users/<id>/rooms
pub fn user_rooms_get(
    pool: PgPool,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path!(Uuid / "rooms")
        .and(warp::get())
        .and(with_db(pool))
        .and_then(list_rooms_for_user)
}

// GET /my/rooms
pub fn my_rooms_get(
    pool: PgPool,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path!("rooms")
        .and(warp::get())
        .and(for_authorized())
        .and(with_db(pool))
        .and_then(list_rooms_for_user)
}

// POST /my/sessions with JSON body (this logs someone in)
pub fn my_sessions_post(
    pool: PgPool,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path!("sessions")
        .and(warp::post())
        .and(json_body::<UserLoginReq>())
        .and(with_db(pool))
        .and_then(login_user)
}

// GET /rooms?offset=3&limit=5
pub fn rooms_get(
    pool: PgPool,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::get()
        .and(warp::query::<ListOptions>())
        .and(with_db(pool))
        .and_then(list_rooms)
}

// POST /rooms with JSON body
pub fn rooms_post(
    pool: PgPool,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::post()
        .and(with_db(pool))
        .and(for_authorized())
        .and(json_body::<RoomCreateReq>())
        .and_then(create_room)
}

// DELETE /rooms/<ID>
pub fn rooms_delete(
    pool: PgPool,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path!(Uuid)
        .and(warp::delete())
        .and(with_db(pool))
        .and(for_authorized())
        .and_then(delete_room)
}

// WS /rooms/<ID>/host?token=<TOKEN>
pub fn rooms_host_ws(
    pool: PgPool,
    host_conns: HostConnections,
    listen_conns: ListenConnections,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path!(Uuid / "host")
        .and(for_authorized_ws())
        .and(warp::ws())
        .and(with_db(pool))
        .and(with_conns(host_conns, listen_conns))
        .and_then(host_room)
}

// WS /rooms/<ID>/listen
pub fn rooms_listen_ws(
    pool: PgPool,
    host_conns: HostConnections,
    listen_conns: ListenConnections,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path!(Uuid / "listen")
        .and(warp::ws())
        .and(with_db(pool))
        .and(with_conns(host_conns, listen_conns))
        .and_then(listen_room)
}

fn with_conns(
    host_conns: HostConnections,
    listen_conns: ListenConnections,
) -> impl Filter<Extract = ((HostConnections, ListenConnections),), Error = Infallible> + Clone {
    warp::any().map(move || (host_conns.clone(), listen_conns.clone()))
}

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
