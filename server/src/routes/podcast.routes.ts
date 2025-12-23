import { Router } from 'express';
import * as podcastController from '../controllers/podcast.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// ============================================
// Public Routes (no auth required - can browse without login)
// ============================================

// Search podcasts via iTunes API
router.get('/search', podcastController.searchPodcasts);

// Get episodes from RSS feed
router.get('/episodes', podcastController.getEpisodes);

// Get trending podcasts
router.get('/trending', podcastController.getTrending);

// ============================================
// User-Specific Routes (require auth)
// ============================================

// Toggle subscription to a channel
router.post('/subscribe', authenticate, podcastController.toggleSubscription);

// Get user's subscribed channels
router.get('/subscriptions', authenticate, podcastController.getSubscriptions);

// Get user's personalized feed
router.get('/my-feed', authenticate, podcastController.getMyFeed);

// Get listening history
router.get('/history', authenticate, podcastController.getHistory);

// ============================================
// Tracking Routes
// ============================================

// Track episode view
router.post('/view', authenticate, podcastController.trackView);

// Toggle like on episode
router.post('/like', authenticate, podcastController.toggleLike);

// Save playback progress
router.post('/progress', authenticate, podcastController.saveProgress);

export default router;
