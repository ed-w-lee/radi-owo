table! {
    rooms (id) {
        id -> Uuid,
        user_id -> Uuid,
        room_name -> Varchar,
        host_status -> Int2,
        created_at -> Timestamptz,
        last_hosted -> Nullable<Timestamptz>,
    }
}

table! {
    users (id) {
        id -> Uuid,
        display_name -> Varchar,
        email -> Varchar,
        created_at -> Timestamptz,
    }
}

joinable!(rooms -> users (user_id));

allow_tables_to_appear_in_same_query!(
    rooms,
    users,
);
