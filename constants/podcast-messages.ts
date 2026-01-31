import { Labels } from '../src/utils/i18n';

/**
 * Helper to get localized podcast messages.
 * This adapts the old PODCAST_MESSAGES constant to the new i18n system.
 */
export const getPodcastMessages = (labels: Labels) => {
    // If labels.podcast.msg exists, use it as a base, otherwise fallback to original Chinese
    const msg = labels.podcast?.msg || {};

    return {
        // Loading States
        LOADING_TRANSCRIPT: msg.LOADING_TRANSCRIPT || 'AI 正在生成智能字幕...',
        LOADING_FIRST_TIME: msg.LOADING_FIRST_TIME || '首次生成约需 1 分钟',
        LOADING_HISTORY: msg.LOADING_HISTORY || '加载历史记录...',
        LOADING_EPISODES: msg.LOADING_EPISODES || '加载剧集列表...',

        // Error Messages
        ERROR_LOAD_HISTORY: msg.ERROR_LOAD_HISTORY || '无法加载历史记录，请稍后重试',
        ERROR_LOAD_TRANSCRIPT: msg.ERROR_LOAD_TRANSCRIPT || '使用演示字幕 (AI 生成失败)',
        ERROR_LOAD_PLAYLIST: msg.ERROR_LOAD_PLAYLIST || '无法加载播放列表',
        ERROR_SUBSCRIBE_FAILED: msg.ERROR_SUBSCRIBE_FAILED || '订阅失败，请稍后重试',
        ERROR_UNSUBSCRIBE_FAILED: msg.ERROR_UNSUBSCRIBE_FAILED || '取消订阅失败',
        ERROR_NETWORK: msg.ERROR_NETWORK || '网络错误，请检查您的网络连接',
        ERROR_INVALID_EPISODE: msg.ERROR_INVALID_EPISODE || '无效的剧集链接',

        // Empty States
        EMPTY_HISTORY: msg.EMPTY_HISTORY || '暂无播放记录',
        EMPTY_TRANSCRIPT: msg.EMPTY_TRANSCRIPT || '暂无字幕内容',
        EMPTY_PLAYLIST: msg.EMPTY_PLAYLIST || '暂无其他剧集',
        EMPTY_SUBSCRIPTIONS: msg.EMPTY_SUBSCRIPTIONS || '还没有订阅任何频道',
        EMPTY_SEARCH: msg.EMPTY_SEARCH || '未找到相关播客',
        EMPTY_TRENDING: msg.EMPTY_TRENDING || '暂无数据',

        // Actions
        ACTION_RETRY: msg.ACTION_RETRY || '重试',
        ACTION_SUBSCRIBE: msg.ACTION_SUBSCRIBE || '订阅',
        ACTION_UNSUBSCRIBE: msg.ACTION_UNSUBSCRIBE || '取消订阅',
        ACTION_PLAY: msg.ACTION_PLAY || '播放',
        ACTION_EXPLORE: msg.ACTION_EXPLORE || '探索频道',
        ACTION_SEARCH: msg.ACTION_SEARCH || '搜索韩语播客...',
        ACTION_REGENERATE: msg.ACTION_REGENERATE || '重新生成字幕 (修正排版)',
        ACTION_REGENERATE_CONFIRM: msg.ACTION_REGENERATE_CONFIRM || '重新生成字幕可能需要 1-2 分钟。确定要重新生成吗？',

        // Player Controls
        PLAYER_TRANSLATION_TITLE: msg.PLAYER_TRANSLATION_TITLE || '翻译字幕',
        PLAYER_TRANSLATION_DESC: msg.PLAYER_TRANSLATION_DESC || '显示中文翻译',
        PLAYER_AUTO_SCROLL_ON: msg.PLAYER_AUTO_SCROLL_ON || '自动滚动: 开',
        PLAYER_AUTO_SCROLL_OFF: msg.PLAYER_AUTO_SCROLL_OFF || '自动滚动: 关',
        PLAYER_BACK_TO_FEED: msg.PLAYER_BACK_TO_FEED || 'Back to Feed',
        PLAYER_PLAYLIST: msg.PLAYER_PLAYLIST || '播放列表',
        PLAYER_FAVORITE: msg.PLAYER_FAVORITE || '收藏此集',
        PLAYER_SHARE: msg.PLAYER_SHARE || '分享',
        PLAYER_LOOP: msg.PLAYER_LOOP || 'Loop',
        PLAYER_LOOP_ACTIVE: msg.PLAYER_LOOP_ACTIVE || 'Loop Active',
        PLAYER_SET_B: msg.PLAYER_SET_B || 'Set B',

        // Dashboard
        DASHBOARD_TITLE: msg.DASHBOARD_TITLE || '播客中心',
        DASHBOARD_LATEST: msg.DASHBOARD_LATEST || '最新更新',
        DASHBOARD_EDITOR_PICKS: msg.DASHBOARD_EDITOR_PICKS || '编辑推荐',
        DASHBOARD_TRENDING: msg.DASHBOARD_TRENDING || '热门榜单',
        DASHBOARD_APPLE_TOP: msg.DASHBOARD_APPLE_TOP || 'Apple Top 10',
        DASHBOARD_COMMUNITY: msg.DASHBOARD_COMMUNITY || '社区热播',
        DASHBOARD_VIEW_ALL: msg.DASHBOARD_VIEW_ALL || '查看全部',
        DASHBOARD_SEARCH_RESULTS: msg.DASHBOARD_SEARCH_RESULTS || '搜索结果',
        DASHBOARD_CANCEL: msg.DASHBOARD_CANCEL || '取消',
        DASHBOARD_NO_RECOMMENDATIONS: msg.DASHBOARD_NO_RECOMMENDATIONS || '暂无推荐，开始搜索并订阅吧！',

        // History
        HISTORY_TITLE: msg.HISTORY_TITLE || '收听历史',

        // Time
        TIME_TODAY: msg.TIME_TODAY || '今天',
        TIME_YESTERDAY: msg.TIME_YESTERDAY || '昨天',
        TIME_DAYS_AGO: msg.TIME_DAYS_AGO || '天前',
    };
};

// Legacy support for parts of the app that haven't been migrated yet
// Note: This will always return Chinese if used as a constant.
export const PODCAST_MESSAGES = {
    LOADING_TRANSCRIPT: 'AI 正在生成智能字幕...',
    LOADING_FIRST_TIME: '首次生成约需 1 分钟',
    LOADING_HISTORY: '加载历史记录...',
    LOADING_EPISODES: '加载剧集列表...',
    ERROR_LOAD_HISTORY: '无法加载历史记录，请稍后重试',
    ERROR_LOAD_TRANSCRIPT: '使用演示字幕 (AI 生成失败)',
    ERROR_LOAD_PLAYLIST: '无法加载播放列表',
    ERROR_SUBSCRIBE_FAILED: '订阅失败，请稍后重试',
    ERROR_UNSUBSCRIBE_FAILED: '取消订阅失败',
    ERROR_NETWORK: '网络错误，请检查您的网络连接',
    ERROR_INVALID_EPISODE: '无效的剧集链接',
    EMPTY_HISTORY: '暂无播放记录',
    EMPTY_TRANSCRIPT: '暂无字幕内容',
    EMPTY_PLAYLIST: '暂无其他剧集',
    EMPTY_SUBSCRIPTIONS: '还没有订阅任何频道',
    EMPTY_SEARCH: '未找到相关播客',
    EMPTY_TRENDING: '暂无数据',
    ACTION_RETRY: '重试',
    ACTION_SUBSCRIBE: '订阅',
    ACTION_UNSUBSCRIBE: '取消订阅',
    ACTION_PLAY: '播放',
    ACTION_EXPLORE: '探索频道',
    ACTION_SEARCH: '搜索韩语播客...',
    ACTION_REGENERATE: '重新生成字幕 (修正排版)',
    ACTION_REGENERATE_CONFIRM: '重新生成字幕可能需要 1-2 分钟。确定要重新生成吗？',
    PLAYER_TRANSLATION_TITLE: '翻译字幕',
    PLAYER_TRANSLATION_DESC: '显示中文翻译',
    PLAYER_AUTO_SCROLL_ON: '自动滚动: 开',
    PLAYER_AUTO_SCROLL_OFF: '自动滚动: 关',
    PLAYER_BACK_TO_FEED: 'Back to Feed',
    PLAYER_PLAYLIST: '播放列表',
    PLAYER_FAVORITE: '收藏此集',
    PLAYER_SHARE: '分享',
    PLAYER_LOOP: 'Loop',
    PLAYER_LOOP_ACTIVE: 'Loop Active',
    PLAYER_SET_B: 'Set B',
    DASHBOARD_TITLE: '播客学韩语',
    DASHBOARD_LATEST: '最新更新',
    DASHBOARD_EDITOR_PICKS: '编辑推荐',
    DASHBOARD_TRENDING: '热门榜单',
    DASHBOARD_APPLE_TOP: 'Apple Top 10',
    DASHBOARD_COMMUNITY: '社区热播',
    DASHBOARD_VIEW_ALL: '查看全部',
    DASHBOARD_SEARCH_RESULTS: '搜索结果',
    DASHBOARD_CANCEL: '取消',
    DASHBOARD_NO_RECOMMENDATIONS: '暂无推荐，开始搜索并订阅吧！',
    HISTORY_TITLE: '播放历史',
    TIME_TODAY: '今天',
    TIME_YESTERDAY: '昨天',
    TIME_DAYS_AGO: '天前',
} as const;
