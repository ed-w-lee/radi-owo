use warp::reject::Reject;

#[derive(Debug)]
pub struct DatabaseError;

impl Reject for DatabaseError {}

#[derive(Debug)]
pub struct WeirdTokioError;

impl Reject for WeirdTokioError {}

#[derive(Debug)]
pub struct UnexpectedError;

impl Reject for UnexpectedError {}
