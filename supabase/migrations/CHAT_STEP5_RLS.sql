-- STEP 5: Run this last
ALTER TABLE school_parent_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_parent_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_spc" ON school_parent_connections;
DROP POLICY IF EXISTS "allow_all_spch" ON school_parent_children;
DROP POLICY IF EXISTS "allow_all_sct" ON school_chat_threads;
DROP POLICY IF EXISTS "allow_all_scm" ON school_chat_messages;

CREATE POLICY "allow_all_spc" ON school_parent_connections FOR ALL USING (true);
CREATE POLICY "allow_all_spch" ON school_parent_children FOR ALL USING (true);
CREATE POLICY "allow_all_sct" ON school_chat_threads FOR ALL USING (true);
CREATE POLICY "allow_all_scm" ON school_chat_messages FOR ALL USING (true);
