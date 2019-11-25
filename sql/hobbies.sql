-- Table: public."HOBBIES"

DROP TABLE public."HOBBIES" CASCADE;

CREATE TABLE public."HOBBIES"
(
    user_id integer NOT NULL,
    hobby character varying(256) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT user_id FOREIGN KEY (user_id)
        REFERENCES public."USERS" (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE public."HOBBIES"
    OWNER to me;