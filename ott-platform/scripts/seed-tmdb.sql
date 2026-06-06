-- ─── Clean existing sample data if present ────────────────────
DELETE FROM content WHERE slug IN (
  'inception', 'the-dark-knight', 'interstellar', 'avatar-the-way-of-water',
  'spider-man-into-the-spider-verse', 'dune-part-two', 'oppenheimer',
  'everything-everywhere-all-at-once', 'parasite', 'the-matrix',
  'breaking-bad', 'stranger-things', 'game-of-thrones', 'chernobyl',
  'the-last-of-us', 'the-mandalorian', 'sherlock', 'black-mirror',
  'succession', 'severance'
);

-- ─── 1. Inception (2010) ──────────────────────────────────────
DO $$
DECLARE
    m_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, duration_seconds, age_rating, status, is_premium,
        is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'movie', 'Inception', 'inception',
        'Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets, is offered a chance to regain his old life as payment for a task considered to be impossible: "inception", the implantation of another person''s idea into a target''s subconscious.',
        'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
        'en', 2010, 8880, 'PG-13', 'published', false, true, true, 8.8,
        'https://image.tmdb.org/t/p/w500/o0j4TC56615Ftr2n2O1wNscR2dF.jpg',
        'https://image.tmdb.org/t/p/original/s3TBrRGB1K7jY4G2616MuK4n3dC.jpg', NOW()
    ) RETURNING id INTO m_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (m_id, 1), (m_id, 7), (m_id, 4) ON CONFLICT DO NOTHING;
END $$;

-- ─── 2. The Dark Knight (2008) ────────────────────────────────
DO $$
DECLARE
    m_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, duration_seconds, age_rating, status, is_premium,
        is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'movie', 'The Dark Knight', 'the-dark-knight',
        'Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets. The partnership proves to be effective, but they soon find themselves prey to a reign of chaos unleashed by a rising criminal mastermind known to Gotham as the Joker.',
        'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.',
        'en', 2008, 9120, 'PG-13', 'published', false, true, true, 9.0,
        'https://image.tmdb.org/t/p/w500/qJ2tWGBCOBBj78wRKCqEt25M1nL.jpg',
        'https://image.tmdb.org/t/p/original/dqK9HnZ1n2n79wfs6A44zzCcq6g.jpg', NOW()
    ) RETURNING id INTO m_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (m_id, 1), (m_id, 10), (m_id, 3) ON CONFLICT DO NOTHING;
END $$;

-- ─── 3. Interstellar (2014) ───────────────────────────────────
DO $$
DECLARE
    m_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, duration_seconds, age_rating, status, is_premium,
        is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'movie', 'Interstellar', 'interstellar',
        'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.',
        'A team of explorers travel through a wormhole in space in an attempt to ensure humanity''s survival.',
        'en', 2014, 10140, 'PG-13', 'published', true, true, false, 8.7,
        'https://image.tmdb.org/t/p/w500/gEU2QniE6E7vNIvXTLM3St0q52B.jpg',
        'https://image.tmdb.org/t/p/original/rAiw5T42gIgg9V2VXC5g6n928qM.jpg', NOW()
    ) RETURNING id INTO m_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (m_id, 7), (m_id, 3) ON CONFLICT DO NOTHING;
END $$;

-- ─── 4. Avatar: The Way of Water (2022) ───────────────────────
DO $$
DECLARE
    m_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, duration_seconds, age_rating, status, is_premium,
        is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'movie', 'Avatar: The Way of Water', 'avatar-the-way-of-water',
        'Set more than a decade after the events of the first film, learn the story of the Sully family (Jake, Neytiri, and their kids), the trouble that follows them, the lengths they go to keep each other safe, the battles they fight to stay alive, and the tragedies they endure.',
        'Jake Sully lives with his newfound family formed on the extrasolar moon Pandora. Once a familiar threat returns, Jake must work with Neytiri and the Na''vi to protect their home.',
        'en', 2022, 11520, 'PG-13', 'published', true, false, true, 7.6,
        'https://image.tmdb.org/t/p/w500/t6HIqrRAclj2oZhtPTcjPn1mGC1.jpg',
        'https://image.tmdb.org/t/p/original/8s4e1n4NDvgo0hZ21R5GZKA6ehA.jpg', NOW()
    ) RETURNING id INTO m_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (m_id, 1), (m_id, 7), (m_id, 12) ON CONFLICT DO NOTHING;
END $$;

-- ─── 5. Spider-Man: Into the Spider-Verse (2018) ──────────────
DO $$
DECLARE
    m_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, duration_seconds, age_rating, status, is_premium,
        is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'movie', 'Spider-Man: Into the Spider-Verse', 'spider-man-into-the-spider-verse',
        'Miles Morales is juggling his life between being a high school student and being a spider-man. When Wilson "Kingpin" Fisk uses a super collider, others from across the Spider-Verse are pulled into this dimension.',
        'Teen Miles Morales becomes the Spider-Man of his universe, and must join with five spider-powered individuals from other dimensions to stop a threat.',
        'en', 2018, 7020, 'PG', 'published', false, false, true, 8.4,
        'https://image.tmdb.org/t/p/w500/iiRs6wzg0H1mU2IYaoUjUuuuRba.jpg',
        'https://image.tmdb.org/t/p/original/x2Ez131zyrZEUT7xJNAVgnjoPTn.jpg', NOW()
    ) RETURNING id INTO m_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (m_id, 9), (m_id, 1), (m_id, 7) ON CONFLICT DO NOTHING;
END $$;

-- ─── 6. Dune: Part Two (2024) ─────────────────────────────────
DO $$
DECLARE
    m_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, duration_seconds, age_rating, status, is_premium,
        is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'movie', 'Dune: Part Two', 'dune-part-two',
        'Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, he endeavors to prevent a terrible future only he can foresee.',
        'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
        'en', 2024, 9960, 'PG-13', 'published', true, true, true, 8.6,
        'https://image.tmdb.org/t/p/w500/czemie0vOk2V156v4HQjRL9744c.jpg',
        'https://image.tmdb.org/t/p/original/xOMo8j320vC6262EPQ7ws76ZwbY.jpg', NOW()
    ) RETURNING id INTO m_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (m_id, 7), (m_id, 1), (m_id, 3) ON CONFLICT DO NOTHING;
END $$;

-- ─── 7. Oppenheimer (2023) ────────────────────────────────────
DO $$
DECLARE
    m_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, duration_seconds, age_rating, status, is_premium,
        is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'movie', 'Oppenheimer', 'oppenheimer',
        'The story of J. Robert Oppenheimer''s role in the development of the atomic bomb during World War II.',
        'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
        'en', 2023, 10800, 'R', 'published', true, false, false, 8.4,
        'https://image.tmdb.org/t/p/w500/8Gxv2wS0EH1Sli2pDeW7UTJ8P3cc.jpg',
        'https://image.tmdb.org/t/p/original/fm6nmvY70NDPg6w2UOWOG0a9nVe.jpg', NOW()
    ) RETURNING id INTO m_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (m_id, 13), (m_id, 3) ON CONFLICT DO NOTHING;
END $$;

-- ─── 8. Everything Everywhere All at Once (2022) ──────────────
DO $$
DECLARE
    m_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, duration_seconds, age_rating, status, is_premium,
        is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'movie', 'Everything Everywhere All at Once', 'everything-everywhere-all-at-once',
        'An aging Chinese immigrant is swept up in an insane adventure, where she alone can save the world by exploring other universes connecting with the lives she could have led.',
        'A middle-aged Chinese immigrant is swept up into an insane adventure in which she alone can save existence by exploring other universes.',
        'en', 2022, 8340, 'R', 'published', false, false, true, 7.8,
        'https://image.tmdb.org/t/p/w500/w3zJ23VJVq4n6O0o2fK4t67o263.jpg',
        'https://image.tmdb.org/t/p/original/fOy2Jglv65tr4j2jOuKj76UrEUp.jpg', NOW()
    ) RETURNING id INTO m_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (m_id, 2), (m_id, 7), (m_id, 1) ON CONFLICT DO NOTHING;
END $$;

-- ─── 9. Parasite (2019) ───────────────────────────────────────
DO $$
DECLARE
    m_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, duration_seconds, age_rating, status, is_premium,
        is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'movie', 'Parasite', 'parasite',
        'All unemployed, Ki-taek''s family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.',
        'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
        'en', 2019, 7920, 'R', 'published', false, false, false, 8.5,
        'https://image.tmdb.org/t/p/w500/7IiTTjV7E25v07XgEVa6t9uVscx.jpg',
        'https://image.tmdb.org/t/p/original/hiK5W1k1v3u5d7fT98tUq1RCHmg.jpg', NOW()
    ) RETURNING id INTO m_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (m_id, 4), (m_id, 3), (m_id, 2) ON CONFLICT DO NOTHING;
END $$;

-- ─── 10. The Matrix (1999) ────────────────────────────────────
DO $$
DECLARE
    m_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, duration_seconds, age_rating, status, is_premium,
        is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'movie', 'The Matrix', 'the-matrix',
        'Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents fighting the vast and powerful computers who now rule the world.',
        'When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.',
        'en', 1999, 8160, 'R', 'published', false, false, false, 8.7,
        'https://image.tmdb.org/t/p/w500/f89U3wz6oo2e212tG86mc7eb3jT.jpg',
        'https://image.tmdb.org/t/p/original/oP36Cj2pFG7Z18wuiZueepj676B.jpg', NOW()
    ) RETURNING id INTO m_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (m_id, 7), (m_id, 1) ON CONFLICT DO NOTHING;
END $$;


-- ─── 11. Breaking Bad (Web Series) ───────────────────────────
DO $$
DECLARE
    s_id uuid;
    se_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, age_rating, status, is_premium, is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'series', 'Breaking Bad', 'breaking-bad',
        'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student in order to secure his family''s financial future.',
        'A chemistry teacher diagnosed with cancer turns to meth manufacturing to secure his family''s future.',
        'en', 2008, 'TV-MA', 'published', true, true, true, 9.5,
        'https://image.tmdb.org/t/p/w500/ztkKzT1w90Juba41446h96TBE21.jpg',
        'https://image.tmdb.org/t/p/original/9g56Jm42449U2s467tP83A9n0c5.jpg', NOW()
    ) RETURNING id INTO s_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (s_id, 3), (s_id, 10), (s_id, 4) ON CONFLICT DO NOTHING;

    INSERT INTO seasons (content_id, season_number, title, total_episodes)
    VALUES (s_id, 1, 'Season 1', 3) RETURNING id INTO se_id;

    INSERT INTO episodes (content_id, season_id, episode_number, title, description, duration_seconds, status, published_at) VALUES
    (s_id, se_id, 1, 'Pilot', 'A high school chemistry teacher learns he has terminal lung cancer and teams up with a former student to manufacture meth.', 3480, 'published', NOW()),
    (s_id, se_id, 2, 'Cat''s in the Bag...', 'Walt and Jesse attempt to dispose of the two bodies in the RV, which becomes increasingly complicated.', 2880, 'published', NOW()),
    (s_id, se_id, 3, '...And the Bag''s in the River', 'Walt is forced to decide whether to kill Krazy-8 or release him, while Marie believes Walter Jr. is smoking pot.', 2880, 'published', NOW());
END $$;

-- ─── 12. Stranger Things (Web Series) ────────────────────────
DO $$
DECLARE
    s_id uuid;
    se_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, age_rating, status, is_premium, is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'series', 'Stranger Things', 'stranger-things',
        'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
        'In a small town, secret experiments, supernatural forces, and a strange girl are uncovered during a boy''s search.',
        'en', 2016, 'TV-14', 'published', false, true, true, 8.7,
        'https://image.tmdb.org/t/p/w500/49WJfeN0mhmRKr9ndTYAlCamv4N.jpg',
        'https://image.tmdb.org/t/p/original/56v2Kj2qUj222IL4tFu7OG4WwOI.jpg', NOW()
    ) RETURNING id INTO s_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (s_id, 7), (s_id, 3), (s_id, 15) ON CONFLICT DO NOTHING;

    INSERT INTO seasons (content_id, season_number, title, total_episodes)
    VALUES (s_id, 1, 'Season 1', 3) RETURNING id INTO se_id;

    INSERT INTO episodes (content_id, season_id, episode_number, title, description, duration_seconds, status, published_at) VALUES
    (s_id, se_id, 1, 'Chapter One: The Vanishing of Will Byers', 'On his way home from a friend''s house, young Will sees something terrifying. Nearby, a sinister secret lurks in the depths of a government lab.', 2880, 'published', NOW()),
    (s_id, se_id, 2, 'Chapter Two: The Weirdo on Maple Street', 'Lucas, Mike and Dustin try to talk to the girl they found in the woods. Hopper questions an anxious Joyce about a phone call.', 3300, 'published', NOW()),
    (s_id, se_id, 3, 'Chapter Three: Holly, Jolly', 'An increasingly concerned Nancy looks for Barb and finds out what Jonathan has been up to. Joyce believes Will is communicating with her.', 3060, 'published', NOW());
END $$;

-- ─── 13. Game of Thrones (Web Series) ────────────────────────
DO $$
DECLARE
    s_id uuid;
    se_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, age_rating, status, is_premium, is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'series', 'Game of Thrones', 'game-of-thrones',
        'Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns after being dormant for thousands of years.',
        'Noble families compete for the Iron Throne of Westeros while an ancient evil threatens all.',
        'en', 2011, 'TV-MA', 'published', true, true, false, 9.2,
        'https://image.tmdb.org/t/p/w500/1XS1oq12tRLVI1h4S4o1i9y64g4.jpg',
        'https://image.tmdb.org/t/p/original/2587f730cdd0cf1e27a6f2bd7c25e8a2a8.jpg', NOW()
    ) RETURNING id INTO s_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (s_id, 12), (s_id, 3), (s_id, 1) ON CONFLICT DO NOTHING;

    INSERT INTO seasons (content_id, season_number, title, total_episodes)
    VALUES (s_id, 1, 'Season 1', 3) RETURNING id INTO se_id;

    INSERT INTO episodes (content_id, season_id, episode_number, title, description, duration_seconds, status, published_at) VALUES
    (s_id, se_id, 1, 'Winter Is Coming', 'Jon Arryn, the Hand of the King, is dead. King Robert Baratheon travels to the North to offer the position to his old friend Eddard Stark.', 3720, 'published', NOW()),
    (s_id, se_id, 2, 'The Kingsroad', 'Having accepted the role, Ned leaves Winterfell with his daughters, while Jon Snow heads north to join the Night''s Watch.', 3360, 'published', NOW()),
    (s_id, se_id, 3, 'Lord Snow', 'Ned arrives in King''s Landing to discover the crown''s massive debts, while Catelyn travels in secret to warn him.', 3480, 'published', NOW());
END $$;

-- ─── 14. Chernobyl (Web Series) ──────────────────────────────
DO $$
DECLARE
    s_id uuid;
    se_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, age_rating, status, is_premium, is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'series', 'Chernobyl', 'chernobyl',
        'In April 1986, an explosion at the Chernobyl nuclear power plant in the Union of Soviet Socialist Republics becomes one of the world''s worst man-made disasters.',
        'A dramatization of the 1986 nuclear disaster, documenting the stories of those who sacrificed to save Europe.',
        'en', 2019, 'TV-MA', 'published', false, false, false, 9.4,
        'https://image.tmdb.org/t/p/w500/hlLXt2t76zxJgKPN1Qv15g1mJ2h.jpg',
        'https://image.tmdb.org/t/p/original/jG2XyYn77c77N8rC1wFveA983x1.jpg', NOW()
    ) RETURNING id INTO s_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (s_id, 3), (s_id, 13) ON CONFLICT DO NOTHING;

    INSERT INTO seasons (content_id, season_number, title, total_episodes)
    VALUES (s_id, 1, 'Season 1', 3) RETURNING id INTO se_id;

    INSERT INTO episodes (content_id, season_id, episode_number, title, description, duration_seconds, status, published_at) VALUES
    (s_id, se_id, 1, '1:23:45', 'Plant workers and firefighters risk their lives to control a catastrophic 1986 explosion at a Soviet nuclear power station.', 3540, 'published', NOW()),
    (s_id, se_id, 2, 'Please Remain Calm', 'With millions at risk, physicist Ulana Khomyuk attempts to warn Legasov about a second explosion threat.', 3900, 'published', NOW()),
    (s_id, se_id, 3, 'Open Wide, O Earth', 'Legasov plans a difficult decontamination effort, while Lyudmilla ignores warnings about her husband''s radiation.', 3780, 'published', NOW());
END $$;

-- ─── 15. The Last of Us (Web Series) ──────────────────────────
DO $$
DECLARE
    s_id uuid;
    se_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, age_rating, status, is_premium, is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'series', 'The Last of Us', 'the-last-of-us',
        'Twenty years after modern civilization has been destroyed, Joel, a hardened survivor, is hired to smuggle Ellie, a 14-year-old girl, out of an oppressive quarantine zone. What starts as a small job soon becomes a brutal, heartbreaking journey, as they both must traverse the U.S. and depend on each other for survival.',
        'Survivor Joel smuggles teenager Ellie across a post-apocalyptic United States.',
        'en', 2023, 'TV-MA', 'published', true, false, true, 8.8,
        'https://image.tmdb.org/t/p/w500/uKVKSj6214GwfZypN8C367gXw6q.jpg',
        'https://image.tmdb.org/t/p/original/uDGC7xPMxf7jC455vj66Z14VzII.jpg', NOW()
    ) RETURNING id INTO s_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (s_id, 7), (s_id, 3), (s_id, 1) ON CONFLICT DO NOTHING;

    INSERT INTO seasons (content_id, season_number, title, total_episodes)
    VALUES (s_id, 1, 'Season 1', 3) RETURNING id INTO se_id;

    INSERT INTO episodes (content_id, season_id, episode_number, title, description, duration_seconds, status, published_at) VALUES
    (s_id, se_id, 1, 'When You''re Lost in the Darkness', 'In 2003, a parasitic outbreak ravages the world. Twenty years later, Joel is hired to smuggle a young girl named Ellie.', 4860, 'published', NOW()),
    (s_id, se_id, 2, 'Infected', 'Joel and Tess clash over Ellie''s destiny as they navigate the ruins of Boston and confront mutated hosts.', 3120, 'published', NOW()),
    (s_id, se_id, 3, 'Long, Long Time', 'Joel and Ellie head to the compound of survivalist Bill and his partner Frank, who established a sanctuary.', 4500, 'published', NOW());
END $$;

-- ─── 16. The Mandalorian (Web Series) ────────────────────────
DO $$
DECLARE
    s_id uuid;
    se_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, age_rating, status, is_premium, is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'series', 'The Mandalorian', 'the-mandalorian',
        'The travels of a lone bounty hunter in the outer reaches of the galaxy, far from the authority of the New Republic.',
        'A lone bounty hunter travels the outer reaches of the Star Wars galaxy.',
        'en', 2019, 'TV-PG', 'published', false, false, true, 8.7,
        'https://image.tmdb.org/t/p/w500/e3NnC1w76b8XIE254y37ad9P652.jpg',
        'https://image.tmdb.org/t/p/original/o7362145vbc77a6f2bd7c25e8a2a8.jpg', NOW()
    ) RETURNING id INTO s_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (s_id, 7), (s_id, 1), (s_id, 12) ON CONFLICT DO NOTHING;

    INSERT INTO seasons (content_id, season_number, title, total_episodes)
    VALUES (s_id, 1, 'Season 1', 3) RETURNING id INTO se_id;

    INSERT INTO episodes (content_id, season_id, episode_number, title, description, duration_seconds, status, published_at) VALUES
    (s_id, se_id, 1, 'Chapter 1: The Mandalorian', 'A Mandalorian bounty hunter tracks a target for a well-paying, mysterious client.', 2340, 'published', NOW()),
    (s_id, se_id, 2, 'Chapter 2: The Child', 'Having captured his quarry, the Mandalorian must fight off scavengers and predators to return to his ship.', 1980, 'published', NOW()),
    (s_id, se_id, 3, 'Chapter 3: The Sin', 'The Mandalorian delivers his bounty, but his conscience begins to question his decision.', 2220, 'published', NOW());
END $$;

-- ─── 17. Sherlock (Web Series) ───────────────────────────────
DO $$
DECLARE
    s_id uuid;
    se_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, age_rating, status, is_premium, is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'series', 'Sherlock', 'sherlock',
        'A modern update finds the famous sleuth and his doctor partner solving crime in 21st century London.',
        'A modern update finds the famous detective and his partner solving crimes in 21st century London.',
        'en', 2010, 'TV-14', 'published', false, false, false, 9.1,
        'https://image.tmdb.org/t/p/w500/7IL5X1V1s7FfP0y64g4.jpg',
        'https://image.tmdb.org/t/p/original/j187f730cdd0cf1e27a6f2bd7c25e8a2a8.jpg', NOW()
    ) RETURNING id INTO s_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (s_id, 15), (s_id, 10), (s_id, 3) ON CONFLICT DO NOTHING;

    INSERT INTO seasons (content_id, season_number, title, total_episodes)
    VALUES (s_id, 1, 'Season 1', 3) RETURNING id INTO se_id;

    INSERT INTO episodes (content_id, season_id, episode_number, title, description, duration_seconds, status, published_at) VALUES
    (s_id, se_id, 1, 'A Study in Pink', 'A war hero returned from Afghanistan meets a genius detective, and together they investigate a string of suicides.', 5400, 'published', NOW()),
    (s_id, se_id, 2, 'The Blind Banker', 'Sherlock is hired to investigate a mysterious break-in at a bank, leading him to a smuggling ring.', 5400, 'published', NOW()),
    (s_id, se_id, 3, 'The Great Game', 'A bomber plays a deadly game of wits with Sherlock, forcing him to solve random cases in a time limit.', 5400, 'published', NOW());
END $$;

-- ─── 18. Black Mirror (Web Series) ───────────────────────────
DO $$
DECLARE
    s_id uuid;
    se_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, age_rating, status, is_premium, is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'series', 'Black Mirror', 'black-mirror',
        'An anthology series exploring a twisted, high-tech multiverse where humanity''s greatest innovations and darkest instincts collide.',
        'Anthology series examining the dark, unsettling aspects of modern technology and society.',
        'en', 2011, 'TV-MA', 'published', true, false, false, 8.7,
        'https://image.tmdb.org/t/p/w500/7k2XyYn77c77N8rC1wFveA983x1.jpg',
        'https://image.tmdb.org/t/p/original/56v2Kj2qUj222IL4tFu7OG4WwOI.jpg', NOW()
    ) RETURNING id INTO s_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (s_id, 7), (s_id, 4), (s_id, 3) ON CONFLICT DO NOTHING;

    INSERT INTO seasons (content_id, season_number, title, total_episodes)
    VALUES (s_id, 1, 'Season 1', 3) RETURNING id INTO se_id;

    INSERT INTO episodes (content_id, season_id, episode_number, title, description, duration_seconds, status, published_at) VALUES
    (s_id, se_id, 1, 'The National Anthem', 'A prime minister faces an unthinkable dilemma when a beloved royal family member is kidnapped.', 2640, 'published', NOW()),
    (s_id, se_id, 2, 'Fifteen Million Merits', 'In a world where people must ride exercise bikes to generate power, a man tries to help a woman join a talent show.', 3720, 'published', NOW()),
    (s_id, se_id, 3, 'The Entire History of You', 'In the near future, everyone has access to a memory implant that records everything they do, see and hear.', 2940, 'published', NOW());
END $$;

-- ─── 19. Succession (Web Series) ─────────────────────────────
DO $$
DECLARE
    s_id uuid;
    se_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, age_rating, status, is_premium, is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'series', 'Succession', 'succession',
        'The Roy family is known for controlling the biggest media and entertainment company in the world. However, their world changes when their father steps down from the company.',
        'A dysfunction media family fights for control of their aging father''s media empire.',
        'en', 2018, 'TV-MA', 'published', true, false, true, 8.9,
        'https://image.tmdb.org/t/p/w500/7IiTTjV7E25v07XgEVa6t9uVscx.jpg',
        'https://image.tmdb.org/t/p/original/uDGC7xPMxf7jC455vj66Z14VzII.jpg', NOW()
    ) RETURNING id INTO s_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (s_id, 3), (s_id, 2) ON CONFLICT DO NOTHING;

    INSERT INTO seasons (content_id, season_number, title, total_episodes)
    VALUES (s_id, 1, 'Season 1', 3) RETURNING id INTO se_id;

    INSERT INTO episodes (content_id, season_id, episode_number, title, description, duration_seconds, status, published_at) VALUES
    (s_id, se_id, 1, 'Celebration', 'On his 80th birthday, media tycoon Logan Roy shocks his family by announcing he is not stepping down.', 3600, 'published', NOW()),
    (s_id, se_id, 2, 'Shit Show at the Tipi', 'Logan''s sudden illness causes a scramble among his children to establish who will take control.', 3600, 'published', NOW()),
    (s_id, se_id, 3, 'Lifeboats', 'The family deals with a massive debt crisis that threatens the very existence of the company.', 3600, 'published', NOW());
END $$;

-- ─── 20. Severance (Web Series) ──────────────────────────────
DO $$
DECLARE
    s_id uuid;
    se_id uuid;
BEGIN
    INSERT INTO content (
        type, title, slug, description, short_description, language,
        release_year, age_rating, status, is_premium, is_featured, is_trending, imdb_rating, poster_url, banner_url, published_at
    ) VALUES (
        'series', 'Severance', 'severance',
        'Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives. When a mysterious colleague appears outside of work, it begins a journey to discover the truth about their jobs.',
        'Employees of Lumon Industries undergo a procedure to separate their work and personal memories.',
        'en', 2022, 'TV-MA', 'published', false, false, true, 8.7,
        'https://image.tmdb.org/t/p/w500/l387f730cdd0cf1e27a6f2bd7c25e8a2a8.jpg',
        'https://image.tmdb.org/t/p/original/rAiw5T42gIgg9V2VXC5g6n928qM.jpg', NOW()
    ) RETURNING id INTO s_id;

    INSERT INTO content_genres (content_id, genre_id) VALUES (s_id, 7), (s_id, 4), (s_id, 15) ON CONFLICT DO NOTHING;

    INSERT INTO seasons (content_id, season_number, title, total_episodes)
    VALUES (s_id, 1, 'Season 1', 3) RETURNING id INTO se_id;

    INSERT INTO episodes (content_id, season_id, episode_number, title, description, duration_seconds, status, published_at) VALUES
    (s_id, se_id, 1, 'Good News About Hell', 'Mark is promoted to head of the severed floor, succeeding Petey who was suddenly fired.', 3480, 'published', NOW()),
    (s_id, se_id, 2, 'Half Loop', 'Mark trains new employee Helly, who struggles to accept the nature of her severed existence.', 3120, 'published', NOW()),
    (s_id, se_id, 3, 'In Perpetuity', 'Helly attempts to send a message to her outside self, leading to disciplinary action.', 3240, 'published', NOW());
END $$;
