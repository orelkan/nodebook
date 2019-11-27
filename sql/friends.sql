-- Table: public."FRIENDS"

DROP TABLE IF EXISTS public.friends CASCADE;

CREATE TABLE public.friends
(
    user_id1 integer NOT NULL,
    user_id2 integer NOT NULL,
    CONSTRAINT friends_fk1 FOREIGN KEY (user_id1)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT friends_fk2 FOREIGN KEY (user_id2)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT friends_check CHECK (user_id1 <> user_id2),
    CONSTRAINT friends_uniq UNIQUE (user_id1, user_id2)
)

TABLESPACE pg_default;

ALTER TABLE public.friends
    OWNER to me;