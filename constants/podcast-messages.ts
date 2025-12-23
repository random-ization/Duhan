/**
 * Centralized Chinese UI Messages for Podcast Features
 * This allows for easy i18n support in the future
 */

export const PODCAST_MESSAGES = {
    // Loading States
    LOADING_TRANSCRIPT: 'AI 正在生成智能字幕...',
    LOADING_FIRST_TIME: '首次生成约需 1 分钟',
    LOADING_HISTORY: '加载历史记录...',
    LOADING_EPISODES: '加载剧集列表...',

    // Error Messages
    ERROR_LOAD_HISTORY: '无法加载历史记录，请稍后重试',
    ERROR_LOAD_TRANSCRIPT: '使用演示字幕 (AI 生成失败)',
    ERROR_LOAD_PLAYLIST: '无法加载播放列表',
    ERROR_SUBSCRIBE_FAILED: '订阅失败，请稍后重试',
    ERROR_UNSUBSCRIBE_FAILED: '取消订阅失败',
    ERROR_NETWORK: '网络错误，请检查您的网络连接',
    ERROR_INVALID_EPISODE: '无效的剧集链接',

    // Empty States
    EMPTY_HISTORY: '暂无播放记录',
    EMPTY_TRANSCRIPT: '暂无字幕内容',
    EMPTY_PLAYLIST: '暂无其他剧集',
    EMPTY_SUBSCRIPTIONS: '还没有订阅任何频道',
    EMPTY_SEARCH: '未找到相关播客',
    EMPTY_TRENDING: '暂无数据',

    // Actions
    ACTION_RETRY: '重试',
    ACTION_SUBSCRIBE: '订阅',
    ACTION_UNSUBSCRIBE: '取消订阅',
    ACTION_PLAY: '播放',
    ACTION_EXPLORE: '探索频道',
    ACTION_SEARCH: '搜索韩语播客...',
    ACTION_REGENERATE: '重新生成字幕 (修正排版)',
    ACTION_REGENERATE_CONFIRM: '重新生成字幕可能需要 1-2 分钟。确定要重新生成吗？',

    // Player Controls
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

    // Dashboard
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

    // History
    HISTORY_TITLE: '播放历史',

    // Time
    TIME_TODAY: '今天',
    TIME_YESTERDAY: '昨天',
    TIME_DAYS_AGO: '天前',
} as const;

export type PodcastMessageKey = keyof typeof PODCAST_MESSAGES;
