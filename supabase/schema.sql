-- Erstellen der Sequenz für photos
CREATE SEQUENCE IF NOT EXISTS photos_id_seq;

-- Erstellen der photos Tabelle
CREATE TABLE IF NOT EXISTS photos (
    id integer NOT NULL DEFAULT nextval('photos_id_seq'),
    image_url text NOT NULL,
    votes integer NULL DEFAULT 0,
    created_at timestamp with time zone NULL DEFAULT timezone('utc' :: text, now()),
    account_name text NOT NULL
);

-- Erstellen der vote_confirmations Tabelle
CREATE TABLE IF NOT EXISTS vote_confirmations (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    email text NOT NULL,
    photo_id integer NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now()
);

-- Erstellen der votes Tabelle
CREATE TABLE IF NOT EXISTS votes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    photo_id integer NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone NULL DEFAULT now()
);

-- Erstellen der Funktion zum Inkrementieren der Stimmen
CREATE OR REPLACE FUNCTION increment_votes(row_id integer) RETURNS void AS $$
BEGIN
    UPDATE photos
    SET votes = votes + 1
    WHERE id = row_id;
END;
$$ LANGUAGE PLPGSQL;

-- Erstellen der Funktion zum Dekrementieren der Stimmen
CREATE OR REPLACE FUNCTION decrement_votes(row_id integer) RETURNS void AS $$
BEGIN
    UPDATE photos
    SET votes = GREATEST(votes - 1, 0) -- Verhindert negative Werte
    WHERE id = row_id;
END;
$$ LANGUAGE PLPGSQL;

-- Erstellen der Funktion zum Löschen von Fotos mit zugehörigen Stimmen
CREATE OR REPLACE FUNCTION delete_photo_with_votes() RETURNS trigger AS $$
BEGIN
    -- Delete related votes first
    DELETE FROM votes
    WHERE photo_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE PLPGSQL;

-- Die Tabellen müssen zuerst erstellt werden, bevor wir Trigger und Constraints hinzufügen können
-- Daher führen wir die Befehle in der richtigen Reihenfolge aus

-- Erstellen von Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS votes_photo_id_idx ON votes(photo_id);
CREATE INDEX IF NOT EXISTS votes_email_idx ON votes(email);
CREATE INDEX IF NOT EXISTS vote_confirmations_token_idx ON vote_confirmations(token);
CREATE INDEX IF NOT EXISTS vote_confirmations_email_idx ON vote_confirmations(email);

-- Erstellen des Triggers für das Löschen von Fotos
CREATE TRIGGER before_delete_photos
BEFORE DELETE ON photos
FOR EACH ROW
EXECUTE FUNCTION delete_photo_with_votes();

-- Erstellen von Fremdschlüsseln
ALTER TABLE votes
ADD CONSTRAINT votes_photo_id_fkey
FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE;

ALTER TABLE vote_confirmations
ADD CONSTRAINT vote_confirmations_photo_id_fkey
FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE;

-- Erstellen von Unique-Constraints
ALTER TABLE votes
ADD CONSTRAINT votes_email_unique UNIQUE (email);

ALTER TABLE vote_confirmations
ADD CONSTRAINT vote_confirmations_token_unique UNIQUE (token);