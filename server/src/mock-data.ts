import { CatalogData } from 'shared';

// Normalized catalog data with flat structure and ID references
export const catalogData: CatalogData = {
  performers: [
    {
      id: 'yuval',
      name: 'Yuval',
      thumbnail: 'https://yt3.googleusercontent.com/ELvjLVIwbpAabtF2R3wgzS4fOVL1XU4ySxrm61gdhdlZCx3zYAR5HKmVlsuI_IkhzNpZEjAd=s160-c-k-c0x00ffffff-no-rj',
      description: 'Children\'s music and educational content'
    },
    {
      id: 'little-michal',
      name: 'Little Michal',
      thumbnail: 'https://yt3.googleusercontent.com/ytc/AIdro_nWusm1zzELGjN8vNamxNfqWvZ18QCb98giM0suD4jaOLQ=s160-c-k-c0x00ffffff-no-rj',
      description: 'Educational content for toddlers'
    },
    {
      id: 'roy-boy',
      name: 'Roy Boy',
      thumbnail: 'https://yt3.googleusercontent.com/pVKTM2PwD5QEYrvk2WvjIv_in_yCXnpH9HlgO8EQYXxys0wZRCoNfaCSWhPVHE-e4rorqWjmeA=s160-c-k-c0x00ffffff-no-rj',
      description: 'Adventure and superhero content for kids'
    },
    {
      id: 'uncle-haim',
      name: 'Uncle Haim',
      thumbnail: 'https://yt3.googleusercontent.com/VH4WLb2QOqIsNue1J9MnsVJgraCN3lDc6tSkhTRqhtK6Ug-KLNh7htAXfNbZ-wX8-2hQsNoVFKY=s160-c-k-c0x00ffffff-no-rj',
      description: 'Comedy and entertainment content for children'
    }
  ],
  videos: [
    // Yuval videos
    {
      id: 'israely-boy',
      performerId: 'yuval',
      title: 'יובל המבולבל - אני ילד ישראלי המופע המלא',
      url: 'https://www.youtube.com/watch?v=RLXswLCRG08',
      duration: 240,
      description: 'A fun birthday celebration song',
      thumbnail: 'https://i.ytimg.com/vi/RLXswLCRG08/hqdefault.jpg'
    },
    {
      id: 'yuval-happy-birthday',
      performerId: 'yuval',
      title: 'יום הולדת שמח - עם יובל המבולבל',
      url: 'https://www.youtube.com/watch?v=EsXQkdYj9jg',
      duration: 180,
      description: 'Birthday celebration song',
      thumbnail: 'https://i.ytimg.com/vi/EsXQkdYj9jg/hqdefault.jpg'
    },
    // Little Michal videos
    {
      id: 'michal-colors',
      performerId: 'little-michal',
      title: 'לומדים צבעים עם מיכל הקטנה',
      url: 'https://www.youtube.com/watch?v=mMRfmgR_oZ0',
      duration: 300,
      description: 'Learning colors',
      thumbnail: 'https://i.ytimg.com/vi/mMRfmgR_oZ0/hqdefault.jpg'
    },
    {
      id: 'michal-numbers',
      performerId: 'little-michal',
      title: 'מיכל מלמדת מספרים',
      url: 'https://www.youtube.com/watch?v=numbers123',
      duration: 240,
      description: 'Learning numbers',
      thumbnail: 'https://i.ytimg.com/vi/numbers123/hqdefault.jpg'
    },
    {
      id: 'michal-animals',
      performerId: 'little-michal',
      title: 'חיות בחווה - עם מיכל הקטנה',
      url: 'https://www.youtube.com/watch?v=animals456',
      duration: 360,
      description: 'Farm animals',
      thumbnail: 'https://i.ytimg.com/vi/animals456/hqdefault.jpg'
    },
    // Roy Boy videos
    {
      id: 'roy-superhero',
      performerId: 'roy-boy',
      title: 'רועי בוי - הגיבור שלי',
      url: 'https://www.youtube.com/watch?v=superhero789',
      duration: 420,
      description: 'Superhero adventures',
      thumbnail: 'https://i.ytimg.com/vi/superhero789/hqdefault.jpg'
    },
    {
      id: 'roy-adventure',
      performerId: 'roy-boy',
      title: 'הרפתקה עם רועי',
      url: 'https://www.youtube.com/watch?v=adventure101',
      duration: 480,
      description: 'Adventure time',
      thumbnail: 'https://i.ytimg.com/vi/adventure101/hqdefault.jpg'
    },
    {
      id: 'roy-friends',
      performerId: 'roy-boy',
      title: 'רועי והחברים',
      url: 'https://www.youtube.com/watch?v=friends202',
      duration: 300,
      description: 'Friends and teamwork',
      thumbnail: 'https://i.ytimg.com/vi/friends202/hqdefault.jpg'
    },
    // Uncle Haim videos
    {
      id: 'haim-funny',
      performerId: 'uncle-haim',
      title: 'דוד חיים מצחיק',
      url: 'https://www.youtube.com/watch?v=funny303',
      duration: 360,
      description: 'Comedy show',
      thumbnail: 'https://i.ytimg.com/vi/funny303/hqdefault.jpg'
    },
    {
      id: 'haim-magic',
      performerId: 'uncle-haim',
      title: 'קסמים עם דוד חיים',
      url: 'https://www.youtube.com/watch?v=magic404',
      duration: 300,
      description: 'Magic tricks',
      thumbnail: 'https://i.ytimg.com/vi/magic404/hqdefault.jpg'
    },
    {
      id: 'haim-stories',
      performerId: 'uncle-haim',
      title: 'סיפורים מדוד חיים',
      url: 'https://www.youtube.com/watch?v=stories505',
      duration: 420,
      description: 'Storytelling time',
      thumbnail: 'https://i.ytimg.com/vi/stories505/hqdefault.jpg'
    }
  ],
  scenes: [
    // Scenes for 'israely-boy' video
    {
      id: 'scene-1',
      videoId: 'israely-boy',
      title: 'בילבולים',
      startTime: 112,
      endTime: 145,
      description: 'Introduction and welcome'
    },
    {
      id: 'scene-2',
      videoId: 'israely-boy',
      title: 'דודי-דו',
      startTime: 1533,
      endTime: 1613,
      description: 'שיר עם דודי-דו'
    },
    {
      id: 'scene-3',
      videoId: 'israely-boy',
      title: 'שירים ושיגעון',
      startTime: 1730,
      endTime: 1900,
      description: 'עוד שירים כיפיים'
    },
    // Scenes for 'yuval-happy-birthday' video
    {
      id: 'scene-4',
      videoId: 'yuval-happy-birthday',
      title: 'ברכות יום הולדת',
      startTime: 0,
      endTime: 60,
      description: 'Opening birthday wishes'
    },
    {
      id: 'scene-5',
      videoId: 'yuval-happy-birthday',
      title: 'שיר יום הולדת',
      startTime: 60,
      endTime: 120,
      description: 'Birthday song performance'
    },
    {
      id: 'scene-6',
      videoId: 'yuval-happy-birthday',
      title: 'ריקודים',
      startTime: 120,
      endTime: 180,
      description: 'Dancing celebration'
    },
    // Scenes for 'michal-colors' video
    {
      id: 'scene-7',
      videoId: 'michal-colors',
      title: 'צבע אדום',
      startTime: 0,
      endTime: 60,
      description: 'Learning red color'
    },
    {
      id: 'scene-8',
      videoId: 'michal-colors',
      title: 'צבע כחול',
      startTime: 60,
      endTime: 120,
      description: 'Learning blue color'
    },
    {
      id: 'scene-9',
      videoId: 'michal-colors',
      title: 'צבע צהוב',
      startTime: 120,
      endTime: 180,
      description: 'Learning yellow color'
    },
    {
      id: 'scene-10',
      videoId: 'michal-colors',
      title: 'צבע ירוק',
      startTime: 180,
      endTime: 240,
      description: 'Learning green color'
    },
    {
      id: 'scene-11',
      videoId: 'michal-colors',
      title: 'כל הצבעים ביחד',
      startTime: 240,
      endTime: 300,
      description: 'All colors together'
    },
    // Scenes for 'michal-numbers' video
    {
      id: 'scene-12',
      videoId: 'michal-numbers',
      title: 'מספר 1',
      startTime: 0,
      endTime: 48,
      description: 'Learning number 1'
    },
    {
      id: 'scene-13',
      videoId: 'michal-numbers',
      title: 'מספר 2',
      startTime: 48,
      endTime: 96,
      description: 'Learning number 2'
    },
    {
      id: 'scene-14',
      videoId: 'michal-numbers',
      title: 'מספר 3',
      startTime: 96,
      endTime: 144,
      description: 'Learning number 3'
    },
    {
      id: 'scene-15',
      videoId: 'michal-numbers',
      title: 'מספר 4',
      startTime: 144,
      endTime: 192,
      description: 'Learning number 4'
    },
    {
      id: 'scene-16',
      videoId: 'michal-numbers',
      title: 'מספר 5',
      startTime: 192,
      endTime: 240,
      description: 'Learning number 5'
    },
    // Scenes for 'michal-animals' video
    {
      id: 'scene-17',
      videoId: 'michal-animals',
      title: 'פרה',
      startTime: 0,
      endTime: 72,
      description: 'The cow'
    },
    {
      id: 'scene-18',
      videoId: 'michal-animals',
      title: 'כבשה',
      startTime: 72,
      endTime: 144,
      description: 'The sheep'
    },
    {
      id: 'scene-19',
      videoId: 'michal-animals',
      title: 'עז',
      startTime: 144,
      endTime: 216,
      description: 'The goat'
    },
    {
      id: 'scene-20',
      videoId: 'michal-animals',
      title: 'תרנגולת',
      startTime: 216,
      endTime: 288,
      description: 'The chicken'
    },
    {
      id: 'scene-21',
      videoId: 'michal-animals',
      title: 'כל החיות',
      startTime: 288,
      endTime: 360,
      description: 'All the animals'
    },
    // Scenes for 'roy-superhero' video
    {
      id: 'scene-22',
      videoId: 'roy-superhero',
      title: 'הכוחות שלי',
      startTime: 0,
      endTime: 84,
      description: 'My superpowers'
    },
    {
      id: 'scene-23',
      videoId: 'roy-superhero',
      title: 'להציל את היום',
      startTime: 84,
      endTime: 168,
      description: 'Saving the day'
    },
    {
      id: 'scene-24',
      videoId: 'roy-superhero',
      title: 'שיר הגיבור',
      startTime: 168,
      endTime: 252,
      description: 'Hero song'
    },
    {
      id: 'scene-25',
      videoId: 'roy-superhero',
      title: 'מסע הגיבורים',
      startTime: 252,
      endTime: 336,
      description: 'Hero journey'
    },
    {
      id: 'scene-26',
      videoId: 'roy-superhero',
      title: 'ניצחון!',
      startTime: 336,
      endTime: 420,
      description: 'Victory celebration'
    },
    // Scenes for 'roy-adventure' video
    {
      id: 'scene-27',
      videoId: 'roy-adventure',
      title: 'התחלת ההרפתקה',
      startTime: 0,
      endTime: 96,
      description: 'Adventure begins'
    },
    {
      id: 'scene-28',
      videoId: 'roy-adventure',
      title: 'היער המסתורי',
      startTime: 96,
      endTime: 192,
      description: 'Mysterious forest'
    },
    {
      id: 'scene-29',
      videoId: 'roy-adventure',
      title: 'האתגר הגדול',
      startTime: 192,
      endTime: 288,
      description: 'Big challenge'
    },
    {
      id: 'scene-30',
      videoId: 'roy-adventure',
      title: 'מצאנו את האוצר',
      startTime: 288,
      endTime: 384,
      description: 'Found the treasure'
    },
    {
      id: 'scene-31',
      videoId: 'roy-adventure',
      title: 'חזרה הביתה',
      startTime: 384,
      endTime: 480,
      description: 'Journey home'
    },
    // Scenes for 'roy-friends' video
    {
      id: 'scene-32',
      videoId: 'roy-friends',
      title: 'החברים שלי',
      startTime: 0,
      endTime: 60,
      description: 'Meet my friends'
    },
    {
      id: 'scene-33',
      videoId: 'roy-friends',
      title: 'עבודת צוות',
      startTime: 60,
      endTime: 120,
      description: 'Teamwork'
    },
    {
      id: 'scene-34',
      videoId: 'roy-friends',
      title: 'ביחד נצליח',
      startTime: 120,
      endTime: 180,
      description: 'Together we succeed'
    },
    {
      id: 'scene-35',
      videoId: 'roy-friends',
      title: 'חגיגה',
      startTime: 180,
      endTime: 240,
      description: 'Celebration with friends'
    },
    {
      id: 'scene-36',
      videoId: 'roy-friends',
      title: 'שיר החברות',
      startTime: 240,
      endTime: 300,
      description: 'Friendship song'
    },
    // Scenes for 'haim-funny' video
    {
      id: 'scene-37',
      videoId: 'haim-funny',
      title: 'בדיחות',
      startTime: 0,
      endTime: 90,
      description: 'Jokes time'
    },
    {
      id: 'scene-38',
      videoId: 'haim-funny',
      title: 'פרצופים מצחיקים',
      startTime: 90,
      endTime: 180,
      description: 'Funny faces'
    },
    {
      id: 'scene-39',
      videoId: 'haim-funny',
      title: 'משחקים',
      startTime: 180,
      endTime: 270,
      description: 'Funny games'
    },
    {
      id: 'scene-40',
      videoId: 'haim-funny',
      title: 'שיר מצחיק',
      startTime: 270,
      endTime: 360,
      description: 'Funny song'
    },
    // Scenes for 'haim-magic' video
    {
      id: 'scene-41',
      videoId: 'haim-magic',
      title: 'קסם הכובעים',
      startTime: 0,
      endTime: 75,
      description: 'Hat magic trick'
    },
    {
      id: 'scene-42',
      videoId: 'haim-magic',
      title: 'קסם הקלפים',
      startTime: 75,
      endTime: 150,
      description: 'Card magic trick'
    },
    {
      id: 'scene-43',
      videoId: 'haim-magic',
      title: 'קסם הכדורים',
      startTime: 150,
      endTime: 225,
      description: 'Ball magic trick'
    },
    {
      id: 'scene-44',
      videoId: 'haim-magic',
      title: 'הקסם הגדול',
      startTime: 225,
      endTime: 300,
      description: 'The grand finale magic'
    }
  ]
};
