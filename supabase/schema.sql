-- Arisole StrideIQ Database Schema - COMPLEMENTARY ADDITIONS
-- Run this in your Supabase SQL editor to extend your existing schema
-- 
-- EXISTING TABLES (already in your database, NOT recreated):
-- - profiles (id, username, full_name, avatar_url, updated_at)
-- - user_profiles (id, age, height, weight, biological_sex, activity_level, etc.)
-- - videos (id, user_email, video_type, surface_type, footwear_status, etc.)
-- - gait_analyses (id, user_id, video_url, gait_score, foot_strike, etc.)
--
-- This script adds NEW tables and extensions for the StrideIQ app features

-- =====================================================
-- SOCIAL FEED FEATURES (NEW TABLES)
-- =====================================================

-- Feed posts table - for sharing gait analyses to the community
CREATE TABLE IF NOT EXISTS public.feed_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    gait_analysis_id UUID REFERENCES public.gait_analyses(id) ON DELETE CASCADE,
    caption TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ACHIEVEMENTS & GAMIFICATION (NEW TABLES)
-- =====================================================

-- Achievements definition table
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    is_gold BOOLEAN DEFAULT false,
    requirement_type TEXT,
    requirement_value INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements (junction table)
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Insert default achievements
INSERT INTO public.achievements (name, title, description, icon, is_gold, requirement_type, requirement_value) VALUES
    ('first_perfect_strike', '1st Perfect Strike', 'Score 95+ on your first analysis', 'flash', true, 'score_min', 95),
    ('stride_master', 'Stride Master', 'Complete 10 gait analyses', 'footsteps', false, 'analysis_count', 10),
    ('consistency_king', 'Consistency King', 'Improve score 5 times in a row', 'trending-up', false, 'improvement_streak', 5),
    ('elite_walker', 'Elite Walker', 'Reach a score of 98+', 'star', true, 'score_min', 98),
    ('week_warrior', 'Week Warrior', 'Record walks 7 days straight', 'calendar', false, 'daily_streak', 7),
    ('community_star', 'Community Star', 'Get 100 likes on your posts', 'people', false, 'total_likes', 100),
    ('perfectionist', 'Perfectionist', 'Score 100 on any metric', 'ribbon', true, 'perfect_metric', 1),
    ('health_hero', 'Health Hero', 'Complete 50 total analyses', 'heart', false, 'analysis_count', 50)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- USER ACTIVITY TRACKING (NEW TABLE)
-- =====================================================

-- Daily activity log for streak tracking
CREATE TABLE IF NOT EXISTS public.user_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'analysis', 'login', 'post', etc.
    activity_date DATE DEFAULT CURRENT_DATE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, activity_type, activity_date)
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feed_posts
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON public.feed_posts;
CREATE POLICY "Public posts are viewable by everyone"
    ON public.feed_posts FOR SELECT
    USING (is_public = true);

DROP POLICY IF EXISTS "Users can view own posts" ON public.feed_posts;
CREATE POLICY "Users can view own posts"
    ON public.feed_posts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own posts" ON public.feed_posts;
CREATE POLICY "Users can insert own posts"
    ON public.feed_posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON public.feed_posts;
CREATE POLICY "Users can update own posts"
    ON public.feed_posts FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own posts" ON public.feed_posts;
CREATE POLICY "Users can delete own posts"
    ON public.feed_posts FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for post_likes
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.post_likes;
CREATE POLICY "Likes are viewable by everyone"
    ON public.post_likes FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
CREATE POLICY "Users can like posts"
    ON public.post_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;
CREATE POLICY "Users can unlike posts"
    ON public.post_likes FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for comments
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone"
    ON public.comments FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can add comments" ON public.comments;
CREATE POLICY "Users can add comments"
    ON public.comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments"
    ON public.comments FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for achievements
DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON public.achievements;
CREATE POLICY "Achievements are viewable by everyone"
    ON public.achievements FOR SELECT
    USING (true);

-- RLS Policies for user_achievements
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements"
    ON public.user_achievements FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public achievements are viewable" ON public.user_achievements;
CREATE POLICY "Public achievements are viewable"
    ON public.user_achievements FOR SELECT
    USING (true);

-- RLS Policies for user_activity_log
DROP POLICY IF EXISTS "Users can view own activity" ON public.user_activity_log;
CREATE POLICY "Users can view own activity"
    ON public.user_activity_log FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can log own activity" ON public.user_activity_log;
CREATE POLICY "Users can log own activity"
    ON public.user_activity_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update likes count
CREATE OR REPLACE FUNCTION public.update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.feed_posts
        SET likes_count = likes_count + 1
        WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.feed_posts
        SET likes_count = GREATEST(likes_count - 1, 0)
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for likes count
DROP TRIGGER IF EXISTS on_like_change ON public.post_likes;
CREATE TRIGGER on_like_change
    AFTER INSERT OR DELETE ON public.post_likes
    FOR EACH ROW EXECUTE FUNCTION public.update_likes_count();

-- Function to update comments count
CREATE OR REPLACE FUNCTION public.update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.feed_posts
        SET comments_count = comments_count + 1
        WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.feed_posts
        SET comments_count = GREATEST(comments_count - 1, 0)
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comments count
DROP TRIGGER IF EXISTS on_comment_change ON public.comments;
CREATE TRIGGER on_comment_change
    AFTER INSERT OR DELETE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.update_comments_count();

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_analysis_count INTEGER;
    v_max_score INTEGER;
    v_streak_days INTEGER;
    v_total_likes INTEGER;
BEGIN
    -- Count total analyses
    SELECT COUNT(*) INTO v_analysis_count
    FROM public.gait_analyses
    WHERE user_id = p_user_id AND processing_status = 'completed';
    
    -- Get max gait score
    SELECT COALESCE(MAX(gait_score), 0) INTO v_max_score
    FROM public.gait_analyses
    WHERE user_id = p_user_id AND processing_status = 'completed';
    
    -- Get total likes on user's posts
    SELECT COALESCE(SUM(likes_count), 0) INTO v_total_likes
    FROM public.feed_posts
    WHERE user_id = p_user_id;
    
    -- Award score-based achievements
    IF v_max_score >= 95 THEN
        INSERT INTO public.user_achievements (user_id, achievement_id)
        SELECT p_user_id, id FROM public.achievements WHERE name = 'first_perfect_strike'
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    
    IF v_max_score >= 98 THEN
        INSERT INTO public.user_achievements (user_id, achievement_id)
        SELECT p_user_id, id FROM public.achievements WHERE name = 'elite_walker'
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    
    -- Award count-based achievements
    IF v_analysis_count >= 10 THEN
        INSERT INTO public.user_achievements (user_id, achievement_id)
        SELECT p_user_id, id FROM public.achievements WHERE name = 'stride_master'
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    
    IF v_analysis_count >= 50 THEN
        INSERT INTO public.user_achievements (user_id, achievement_id)
        SELECT p_user_id, id FROM public.achievements WHERE name = 'health_hero'
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
    
    -- Award likes-based achievements
    IF v_total_likes >= 100 THEN
        INSERT INTO public.user_achievements (user_id, achievement_id)
        SELECT p_user_id, id FROM public.achievements WHERE name = 'community_star'
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check achievements after gait analysis completion
CREATE OR REPLACE FUNCTION public.on_gait_analysis_complete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.processing_status = 'completed' AND (OLD.processing_status IS NULL OR OLD.processing_status != 'completed') THEN
        PERFORM public.check_achievements(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_gait_analysis_complete ON public.gait_analyses;
CREATE TRIGGER on_gait_analysis_complete
    AFTER INSERT OR UPDATE ON public.gait_analyses
    FOR EACH ROW EXECUTE FUNCTION public.on_gait_analysis_complete();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_feed_posts_user_id ON public.feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON public.feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_gait_analysis ON public.feed_posts(gait_analysis_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_date ON public.user_activity_log(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_gait_analyses_user_id ON public.gait_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_gait_analyses_created_at ON public.gait_analyses(created_at DESC);

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for feed with user info
CREATE OR REPLACE VIEW public.feed_posts_with_user AS
SELECT 
    fp.*,
    p.username,
    p.full_name,
    p.avatar_url,
    ga.gait_score,
    ga.foot_strike,
    ga.cadence,
    ga.stride_length
FROM public.feed_posts fp
LEFT JOIN public.profiles p ON fp.user_id = p.id
LEFT JOIN public.gait_analyses ga ON fp.gait_analysis_id = ga.id
WHERE fp.is_public = true
ORDER BY fp.created_at DESC;

-- View for user stats summary
CREATE OR REPLACE VIEW public.user_stats AS
SELECT 
    p.id as user_id,
    p.username,
    p.full_name,
    COUNT(DISTINCT ga.id) as total_analyses,
    AVG(ga.gait_score)::INTEGER as avg_gait_score,
    MAX(ga.gait_score) as best_score,
    COUNT(DISTINCT ua.achievement_id) as achievements_count,
    COUNT(DISTINCT fp.id) as posts_count
FROM public.profiles p
LEFT JOIN public.gait_analyses ga ON p.id = ga.user_id AND ga.processing_status = 'completed'
LEFT JOIN public.user_achievements ua ON p.id = ua.user_id
LEFT JOIN public.feed_posts fp ON p.id = fp.user_id
GROUP BY p.id, p.username, p.full_name;
