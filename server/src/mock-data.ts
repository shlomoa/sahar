import { CatalogData } from 'shared';

// Normalized catalog data with flat structure and ID references
export const catalogData: CatalogData = {
  performers: [
    {
      id: 1,
      name: 'Yuval',
      thumbnail: 'https://yt3.googleusercontent.com/ELvjLVIwbpAabtF2R3wgzS4fOVL1XU4ySxrm61gdhdlZCx3zYAR5HKmVlsuI_IkhzNpZEjAd=s160-c-k-c0x00ffffff-no-rj'
    },
    {
      id: 2,
      name: 'Little Michal',
      thumbnail: 'https://yt3.googleusercontent.com/ytc/AIdro_nWusm1zzELGjN8vNamxNfqWvZ18QCb98giM0suD4jaOLQ=s160-c-k-c0x00ffffff-no-rj'
    },
    {
      id: 3,
      name: 'Roy Boy',
      thumbnail: 'https://yt3.googleusercontent.com/pVKTM2PwD5QEYrvk2WvjIv_in_yCXnpH9HlgO8EQYXxys0wZRCoNfaCSWhPVHE-e4rorqWjmeA=s160-c-k-c0x00ffffff-no-rj'
    },
    {
      id: 4,
      name: 'Uncle Haim',
      thumbnail: 'https://yt3.googleusercontent.com/VH4WLb2QOqIsNue1J9MnsVJgraCN3lDc6tSkhTRqhtK6Ug-KLNh7htAXfNbZ-wX8-2hQsNoVFKY=s160-c-k-c0x00ffffff-no-rj'
    }
  ],
  videos: [
    // Yuval videos
    {
      id: 100,
      performerId: 1,
      name: 'יובל המבולבל - אני ילד ישראלי המופע המלא',
      url: 'https://www.youtube.com/watch?v=RLXswLCRG08',
      duration: 240,
      thumbnail: 'https://i.ytimg.com/vi/RLXswLCRG08/hqdefault.jpg'
    },
    {
      id: 101,
      performerId: 1,
      name: 'יום הולדת שמח - עם יובל המבולבל',
      url: 'https://www.youtube.com/watch?v=EsXQkdYj9jg',
      duration: 180,
      thumbnail: 'https://i.ytimg.com/vi/EsXQkdYj9jg/hqdefault.jpg'
    },
    // Little Michal videos
    {
      id: 200,
      performerId: 2,
      name: 'לומדים צבעים עם מיכל הקטנה',
      url: 'https://www.youtube.com/watch?v=mMRfmgR_oZ0',
      duration: 300,
      thumbnail: 'https://i.ytimg.com/vi/mMRfmgR_oZ0/hqdefault.jpg'
    },
    {
      id: 201,
      performerId: 2,
      name: 'מיכל מלמדת מספרים',
      url: 'https://www.youtube.com/watch?v=numbers123',
      duration: 240,
      thumbnail: 'https://i.ytimg.com/vi/numbers123/hqdefault.jpg'
    },
    {
      id: 202,
      performerId: 2,
      name: 'חיות בחווה - עם מיכל הקטנה',
      url: 'https://www.youtube.com/watch?v=animals456',
      duration: 360,
      thumbnail: 'https://i.ytimg.com/vi/animals456/hqdefault.jpg'
    },
    // Roy Boy videos
    {
      id: 300,
      performerId: 3,
      name: 'רועי בוי - הגיבור שלי',
      url: 'https://www.youtube.com/watch?v=superhero789',
      duration: 420,
      thumbnail: 'https://i.ytimg.com/vi/superhero789/hqdefault.jpg'
    },
    {
      id: 301,
      performerId: 3,
      name: 'הרפתקה עם רועי',
      url: 'https://www.youtube.com/watch?v=adventure101',
      duration: 480,
      thumbnail: 'https://i.ytimg.com/vi/adventure101/hqdefault.jpg'
    },
    {
      id: 302,
      performerId: 3,
      name: 'רועי והחברים',
      url: 'https://www.youtube.com/watch?v=friends202',
      duration: 300,
      thumbnail: 'https://i.ytimg.com/vi/friends202/hqdefault.jpg'
    },
    // Uncle Haim videos
    {
      id: 400,
      performerId: 4,
       name: 'דוד חיים מצחיק',
      url: 'https://www.youtube.com/watch?v=funny303',
      duration: 360,
      thumbnail: 'https://i.ytimg.com/vi/funny303/hqdefault.jpg'
    },
    {
      id: 401,
      performerId: 4,
      name: 'קסמים עם דוד חיים',
      url: 'https://www.youtube.com/watch?v=magic404',
      duration: 300,
      thumbnail: 'https://i.ytimg.com/vi/magic404/hqdefault.jpg'
    },
    {
      id: 402,
      performerId: 4,
      name: 'סיפורים מדוד חיים',
      url: 'https://www.youtube.com/watch?v=stories505',
      duration: 420,
      thumbnail: 'https://i.ytimg.com/vi/stories505/hqdefault.jpg'
    }
  ],
  scenes: [
    // Scenes for 'israely-boy' video
    {
      id: 1000,
      videoId: 100,
      name: 'בילבולים',
      startTime: 112,
      endTime: 145,
      
    },
    {
      id: 1001,
      videoId: 100,
      name: 'דודי-דו',
      startTime: 1533,
      endTime: 1613,
      
    },
    {
      id: 1002,
      videoId: 100,
      name: 'שירים ושיגעון',
      startTime: 1730,
      endTime: 1900,
      
    },
    // Scenes for 'yuval-happy-birthday' video
    {
      id: 1003,
      videoId: 101,
      name: 'ברכות יום הולדת',
      startTime: 0,
      endTime: 60,
      
    },
    {
      id: 1004,
      videoId: 101,
      name: 'שיר יום הולדת',
      startTime: 60,
      endTime: 120,
      
    },
    {
      id: 1005,
      videoId: 101,
      name: 'ריקודים',
      startTime: 120,
      endTime: 180,
      
    },
    // Scenes for 'michal-colors' video
    {
      id: 1006,
      videoId: 200,
      name: 'צבע אדום',
      startTime: 0,
      endTime: 60,
      
    },
    {
      id: 1007,
      videoId: 200,
      name: 'צבע כחול',
      startTime: 60,
      endTime: 120,
      
    },
    {
      id: 1008,
      videoId: 200,
      name: 'צבע צהוב',
      startTime: 120,
      endTime: 180,
      
    },
    {
      id: 1009,
      videoId: 200,
      name: 'צבע ירוק',
      startTime: 180,
      endTime: 240,
      
    },
    {
      id: 1010,
      videoId: 200,
      name: 'כל הצבעים ביחד',
      startTime: 240,
      endTime: 300,
      
    },
    // Scenes for 'michal-numbers' video
    {
      id: 1011,
      videoId: 201,
      name: 'מספר 1',
      startTime: 0,
      endTime: 48,
      
    },
    {
      id: 1012,
      videoId: 201,
      name: 'מספר 2',
      startTime: 48,
      endTime: 96,
      
    },
    {
      id: 1013,
      videoId: 201,
      name: 'מספר 3',
      startTime: 96,
      endTime: 144,
      
    },
    {
      id: 1014,
      videoId: 201,
      name: 'מספר 4',
      startTime: 144,
      endTime: 192,
      
    },
    {
      id: 1015,
      videoId: 201,
      name: 'מספר 5',
      startTime: 192,
      endTime: 240,
      
    },
    // Scenes for 'michal-animals' video
    {
      id: 1016,
      videoId: 202,
      name: 'פרה',
      startTime: 0,
      endTime: 72,
      
    },
    {
      id: 1017,
      videoId: 202,
      name: 'כבשה',
      startTime: 72,
      endTime: 144,
      
    },
    {
      id: 1018,
      videoId: 202,
      name: 'עז',
      startTime: 144,
      endTime: 216,
      
    },
    {
      id: 1019,
      videoId: 202,
      name: 'תרנגולת',
      startTime: 216,
      endTime: 288,
      
    },
    {
      id: 1020,
      videoId: 202,
      name: 'כל החיות',
      startTime: 288,
      endTime: 360,
      
    },
    // Scenes for 'roy-superhero' video
    {
      id: 1021,
      videoId: 300,
      name: 'הכוחות שלי',
      startTime: 0,
      endTime: 84,
      
    },
    {
      id: 1022,
      videoId: 300,
      name: 'להציל את היום',
      startTime: 84,
      endTime: 168,
      
    },
    {
      id: 1023,
      videoId: 300,
      name: 'שיר הגיבור',
      startTime: 168,
      endTime: 252,
      
    },
    {
      id: 1024,
      videoId: 300,
      name: 'מסע הגיבורים',
      startTime: 252,
      endTime: 336,
      
    },
    {
      id: 1025,
      videoId: 300,
      name: 'ניצחון!',
      startTime: 336,
      endTime: 420,
      
    },
    // Scenes for 'roy-adventure' video
    {
      id: 1026,
      videoId: 301,
      name: 'התחלת ההרפתקה',
      startTime: 0,
      endTime: 96,
      
    },
    {
      id: 1027,
      videoId: 301,
      name: 'היער המסתורי',
      startTime: 96,
      endTime: 192,
      
    },
    {
      id: 1028,
      videoId: 301,
      name: 'האתגר הגדול',
      startTime: 192,
      endTime: 288,
      
    },
    {
      id: 1029,
      videoId: 301,
      name: 'מצאנו את האוצר',
      startTime: 288,
      endTime: 384,
      
    },
    {
      id: 1030,
      videoId: 301,
      name: 'חזרה הביתה',
      startTime: 384,
      endTime: 480,
      
    },
    // Scenes for 'roy-friends' video
    {
      id: 1031,
      videoId: 302,
      name: 'החברים שלי',
      startTime: 0,
      endTime: 60,
      
    },
    {
      id: 1032,
      videoId: 302,
      name: 'עבודת צוות',
      startTime: 60,
      endTime: 120,
      
    },
    {
      id: 1033,
      videoId: 302,
      name: 'ביחד נצליח',
      startTime: 120,
      endTime: 180,
      
    },
    {
      id: 1034,
      videoId: 302,
      name: 'חגיגה',
      startTime: 180,
      endTime: 240,
      
    },
    {
      id: 1035,
      videoId: 302,
      name: 'שיר החברות',
      startTime: 240,
      endTime: 300,
      
    },
    // Scenes for 'haim-funny' video
    {
      id: 1036,
      videoId: 400,
      name: 'בדיחות',
      startTime: 0,
      endTime: 90,
      
    },
    {
      id: 1037,
      videoId: 400,
      name: 'פרצופים מצחיקים',
      startTime: 90,
      endTime: 180,
      
    },
    {
      id: 1038,
      videoId: 400,
      name: 'משחקים',
      startTime: 180,
      endTime: 270,
      
    },
    {
      id: 1039,
      videoId: 400,
      name: 'שיר מצחיק',
      startTime: 270,
      endTime: 360,
      
    },
    // Scenes for 'haim-magic' video
    {
      id: 1040,
      videoId: 401,
      name: 'קסם הכובעים',
      startTime: 0,
      endTime: 75,
      
    },
    {
      id: 1041,
      videoId: 401,
      name: 'קסם הקלפים',
      startTime: 75,
      endTime: 150,
      
    },
    {
      id: 1042,
      videoId: 401,
      name: 'קסם הכדורים',
      startTime: 150,
      endTime: 225,
      
    },
    {
      id: 1043,
      videoId: 401,
      name: 'הקסם הגדול',
      startTime: 225,
      endTime: 300,
      
    }
  ]
};
