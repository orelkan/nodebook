CREATE OR REPLACE VIEW users_view AS
    SELECT u.*, STRING_AGG(h.hobby, ',') AS hobbies
    FROM users u
    LEFT OUTER JOIN hobbies h ON u.id=h.user_id
    GROUP BY u.id