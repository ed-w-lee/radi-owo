#[macro_use]
extern crate log;

use warp::Filter;

#[tokio::main]
async fn main() {
    pretty_env_logger::init();

    let hello = warp::path!("hello" / String).map(|name| format!("Hello, {}!", name));

    let api = hello;
    let routes = api.with(warp::log("server::routes"));

    info!("Start the server");
    warp::serve(routes).run(([127, 0, 0, 1], 3030)).await;
}
