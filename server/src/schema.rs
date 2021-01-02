table! {
    rooms (id) {
        id -> Uuid,
        user_id -> Uuid,
        room_name -> Varchar,
        created_at -> Timestamptz,
        last_connected -> Nullable<Timestamptz>,
    }
}

table! {
    users (id) {
        id -> Uuid,
        display_name -> Varchar,
        email -> Varchar,
        created_at -> Timestamptz,
        pass_hash -> Bytea,
        salt -> Bytea,
    }
}

joinable!(rooms -> users (user_id));

allow_tables_to_appear_in_same_query!(
    rooms,
    users,
);
