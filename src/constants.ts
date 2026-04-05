import { Language } from './i18n';

export interface Scripture {
  id: string;
  title: string;
  content: string;
  category: 'sutra' | 'mantra' | 'name' | 'meditation';
}

const SCRIPTURES_CN: Scripture[] = [
  {
    id: 'heart-sutra',
    title: '般若波罗蜜多心经',
    category: 'sutra',
    content: `观自在菩萨，行深般若波罗蜜多时，照见五蕴皆空，度一切苦厄。

舍利子，色不异空，空不异色，色即是空，空即是色，受想行识，亦复如是。

舍利子，是诸法空相，不生不灭，不垢不净，不增不减。

是故空中无色，无受想行识，无眼耳鼻舌身意，无色声香味触法，无眼界，乃至无意识界。

无无明，亦无无明尽，乃至无老死，亦无老死尽。

无苦集灭道，无智亦无得。以无所得故，菩提萨埵，依般若波罗蜜多故，心无挂碍，无挂碍故，无有恐怖，远离颠倒梦想，究竟涅槃。

三世诸佛，依般若波罗蜜多故，得阿耨多罗三藐三菩提。

故知般若波罗蜜多，是大神咒，是大明咒，是无上咒，是无等等咒，能除一切苦，真实不虚。

故说般若波罗蜜多咒，即说咒曰：揭谛揭谛，波罗揭谛，波罗僧揭谛，菩提萨婆诃。`
  },
  {
    id: 'diamond-sutra-verse',
    title: '金刚经 (四句偈)',
    category: 'sutra',
    content: `一切有为法，如梦幻泡影，如露亦如电，应作如是观。

凡所有相，皆是虚妄。若见诸相非相，则见如来。

若以色见我，以音声求我，是人行邪道，不能见如来。`
  },
  {
    id: 'amita-sutra',
    title: '佛说阿弥陀经 (节选)',
    category: 'sutra',
    content: `尔时，佛告长老舍利弗：从是西方，过十万亿佛土，有世界名曰极乐，其土有佛，号阿弥陀，今现在说法。

舍利弗，彼土何故名为极乐？其国众生，无有众苦，但受诸乐，故名极乐。

又舍利弗。极乐国土，七重栏楯，七重罗网，七重行树，皆是四宝周匝围绕，是故彼国名为极乐。`
  },
  {
    id: 'pumenpin',
    title: '观世音菩萨普门品 (节选)',
    category: 'sutra',
    content: `世尊妙相具，我今重问彼，佛子何因缘，名为观世音？

具足妙相尊，偈答无尽意：汝听观音行，善应诸方所，弘誓深如海，历劫不思议，侍多千亿佛，发大清净愿。

我为汝略说，闻名及见身，心念不空过，能灭诸有苦。`
  },
  {
    id: 'great-compassion-mantra',
    title: '大悲咒',
    category: 'mantra',
    content: `南无、喝啰怛那、哆啰夜耶，南无、阿唎耶，婆卢羯帝、烁钵啰耶，菩提萨埵婆耶，摩诃萨埵婆耶，摩诃、迦卢尼迦耶，唵，萨皤啰罚曳，数怛那怛写。

南无、悉吉栗埵、伊蒙阿唎耶，婆卢吉帝、室佛啰楞驮婆，南无、那啰谨墀，醯利摩诃、皤哆沙咩，萨婆阿他、豆输朋，阿逝孕，萨婆萨哆、那摩婆萨哆，那摩婆伽，摩罚特豆。`
  },
  {
    id: 'six-syllable',
    title: '六字大明咒',
    category: 'mantra',
    content: `唵 嘛 呢 叭 咪 吽

(Oṃ Maṇi Padme Hūṃ)`
  },
  {
    id: 'rebirth-mantra',
    title: '往生咒',
    category: 'mantra',
    content: `南无阿弥多婆夜。哆他伽多夜。哆地夜他。阿弥利都婆毗。阿弥利哆。悉耽婆毗。阿弥唎哆。毗迦兰帝。阿弥唎哆。毗迦兰多。伽弥腻。伽伽那。枳多迦利。娑婆诃。`
  },
  {
    id: 'medicine-mantra',
    title: '药师灌顶真言',
    category: 'mantra',
    content: `南谟薄伽伐帝。鞞杀社。窭噜薜琉璃。钵喇婆。喝啰阇也。怛他揭多也。阿啰喝帝。三藐三勃陀耶。怛侄他。唵。鞞杀逝。鞞杀逝。鞞杀社。三没揭帝莎诃。`
  },
  {
    id: 'name-amita',
    title: '南无阿弥陀佛',
    category: 'name',
    content: `南无阿弥陀佛

(Namo Amituofo)`
  },
  {
    id: 'name-guanyin',
    title: '南无观世音菩萨',
    category: 'name',
    content: `南无大慈大悲观世音菩萨

(Namo Guan Shi Yin Pu Sa)`
  },
  {
    id: 'name-dizhang',
    title: '南无地藏王菩萨',
    category: 'name',
    content: `南无大愿地藏王菩萨

(Namo Di Zhang Wang Pu Sa)`
  },
  {
    id: 'changsheng-meditation',
    title: '长生老师禅修引导',
    category: 'meditation',
    content: `【长生老师禅修引导】

请大家轻轻合上双眼，全身放松。
让你的心，像清晨的湖面一样平静。

深呼吸，吸气……呼气……
感受宇宙的能量，从头顶缓缓流向全身。
每一个细胞都在呼吸，每一个细胞都在微笑。

放下所有的烦恼，放下所有的牵挂。
此时此刻，你与宇宙合而为一。
你就是光，你就是爱，你就是慈悲。

静静地坐着，观察你的呼吸。
不评判，不执着，只是观察。
心如虚空，包容万物。

愿这份宁静，带给你身心的健康与喜悦。
愿这份慈悲，传递给身边的每一个人。`
  }
];

const SCRIPTURES_TW: Scripture[] = [
  {
    id: 'heart-sutra',
    title: '般若波羅蜜多心經',
    category: 'sutra',
    content: `觀自在菩薩，行深般若波羅蜜多時，照見五蘊皆空，度一切苦厄。

舍利子，色不異空，空不異色，色即是空，空即是色，受想行識，亦復如是。

舍利子，是諸法空相，不生不滅，不垢不淨，不增不減。

是故空中無色，無受想行識，無眼耳鼻舌身意，無色聲香味觸法，無眼界，乃至無意識界。

無無明，亦無無明盡，乃至無老死，亦無老死盡。

無苦集滅道，無智亦無得。以無所得故，菩提薩埵，依般若波羅蜜多故，心無掛礙，無掛礙故，無有恐怖，遠離顛倒夢想，究竟涅槃。

三世諸佛，依般若波羅蜜多故，得阿耨多羅三藐三菩提。

故知般若波羅蜜多，是大神咒，是大明咒，是無上咒，是無等等咒，能除一切苦，真實不虛。

故說般若波羅蜜多咒，即說咒曰：揭諦揭諦，波羅揭諦，波羅僧揭諦，菩提薩婆訶。`
  },
  {
    id: 'diamond-sutra-verse',
    title: '金剛經 (四句偈)',
    category: 'sutra',
    content: `一切有為法，如夢幻泡影，如露亦如電，應作如是觀。

凡所有相，皆是虛妄。若見諸相非相，則見如來。

若以色見我，以音聲求我，是人行邪道，不能見如來。`
  },
  {
    id: 'amita-sutra',
    title: '佛說阿彌陀經 (節選)',
    category: 'sutra',
    content: `爾時，佛告長老舍利弗：從是西方，過十萬億佛土，有世界名曰極樂，其土有佛，號阿彌陀，今現在說法。

舍利弗，彼土何故名為極樂？其國眾生，無有眾苦，但受諸樂，故名極樂。

又舍利弗。極樂國土，七重欄楯，七重羅網，七重行樹，皆是四寶周匝圍繞，是故彼國名為極樂。`
  },
  {
    id: 'pumenpin',
    title: '觀世音菩薩普門品 (節選)',
    category: 'sutra',
    content: `世尊妙相具，我今重問彼，佛子何因緣，名為觀世音？

具足妙相尊，偈答無盡意：汝聽觀音行，善應諸方所，弘誓深如海，歷劫不思議，侍多千億佛，發大清淨願。

我為汝略說，聞名及見身，心念不空過，能滅諸有苦。`
  },
  {
    id: 'great-compassion-mantra',
    title: '大悲咒',
    category: 'mantra',
    content: `南無、喝囉怛那、哆囉夜耶，南無、阿唎耶，婆盧羯帝、爍缽囉耶，菩提薩埵婆耶，摩訶薩埵婆耶，摩訶、迦盧尼迦耶，唵，薩皤囉罰曳，數怛那怛寫。

南無、悉吉栗埵、伊蒙阿唎耶，婆盧吉帝、室佛囉楞馱婆，南無、那囉謹墀，醯利摩訶、皤哆沙咩，薩婆阿他、豆輸朋，阿逝孕，薩婆薩哆、那摩婆薩哆，那摩婆伽，摩罰特豆。`
  },
  {
    id: 'six-syllable',
    title: '六字大明咒',
    category: 'mantra',
    content: `唵 嘛 呢 叭 咪 吽

(Oṃ Maṇi Padme Hūṃ)`
  },
  {
    id: 'rebirth-mantra',
    title: '往生咒',
    category: 'mantra',
    content: `南無阿彌多婆夜。哆他伽多夜。哆地夜他。阿彌利都婆毗。阿彌利哆。悉耽婆毗。阿彌唎哆。毗迦蘭帝。阿彌唎哆。毗迦蘭多。伽彌膩。伽伽那。枳多迦利。娑婆訶。`
  },
  {
    id: 'medicine-mantra',
    title: '藥師灌頂真言',
    category: 'mantra',
    content: `南謨薄伽伐帝。鞞殺社。窶嚕薜琉璃。缽喇婆。喝囉闍也。怛他揭多也。阿啰喝帝。三藐三勃陀耶。怛姪他。唵。鞞殺逝。鞞殺逝。鞞殺社。三沒揭帝莎訶。`
  },
  {
    id: 'name-amita',
    title: '南無阿彌陀佛',
    category: 'name',
    content: `南無阿彌陀佛

(Namo Amituofo)`
  },
  {
    id: 'name-guanyin',
    title: '南無觀世音菩薩',
    category: 'name',
    content: `南無大慈大悲觀世音菩薩

(Namo Guan Shi Yin Pu Sa)`
  },
  {
    id: 'name-dizhang',
    title: '南無地藏王菩薩',
    category: 'name',
    content: `南無大願地藏王菩薩

(Namo Di Zhang Wang Pu Sa)`
  },
  {
    id: 'changsheng-meditation',
    title: '長生老師禪修引導',
    category: 'meditation',
    content: `【長生老師禪修引導】

請大家輕輕合上雙眼，全身放鬆。
讓你的心，像清晨的湖面一樣平靜。

深呼吸，吸氣……呼氣……
感受宇宙的能量，從頭頂緩緩流向全身。
每一個細胞都在呼吸，每一個細胞都在微笑。

放下所有的煩惱，放下所有的牽掛。
此時此刻，你與宇宙合而為一。
你就是光，你就是愛，你就是慈悲。

靜靜地坐著，觀察你的呼吸。
不評判，不執著，只是觀察。
心如虛空，包容萬物。

願這份寧靜，帶給你身心的健康與喜悅。
願這份慈悲，傳遞給身邊的每一個人。`
  }
];

const SCRIPTURES_EN: Scripture[] = [
  {
    id: 'heart-sutra',
    title: 'The Heart Sutra',
    category: 'sutra',
    content: `Avalokiteshvara Bodhisattva, when practicing deeply the Prajna Paramita, perceived that all five skandhas are empty and was saved from all suffering and distress.

Shariputra, form does not differ from emptiness, emptiness does not differ from form. That which is form is emptiness, that which is emptiness form. The same is true of feelings, perceptions, impulses, and consciousness.

Shariputra, all dharmas are marked with emptiness; they do not appear or disappear, are not tainted or pure, do not increase or decrease.

Therefore, in emptiness no form, no feelings, perceptions, impulses, consciousness. No eyes, ears, nose, tongue, body, mind; no color, sound, smell, taste, touch, object of mind; no realm of eyes and so forth until no realm of mind consciousness.

No ignorance and also no extinction of it, and so forth until no old age and death and also no extinction of them.

No suffering, no origination, no stopping, no path, no cognition, also no attainment. With nothing to attain, the Bodhisattva depends on Prajna Paramita and the mind is no hindrance; without any hindrance no fears exist. Far apart from every perverted view one dwells in Nirvana.

In the three worlds all Buddhas depend on Prajna Paramita and attain Anuttara Samyak Sambodhi.

Therefore know that Prajna Paramita is the great transcendent mantra, is the great bright mantra, is the utmost mantra, is the supreme mantra, which is able to relieve all suffering and is true, not false.

So proclaim the Prajna Paramita mantra, proclaim the mantra which says:
Gate Gate Paragate Parasamgate Bodhi Svaha.`
  },
  {
    id: 'diamond-sutra-verse',
    title: 'Diamond Sutra (Verse)',
    category: 'sutra',
    content: `All conditioned phenomena
Are like a dream, an illusion, a bubble, a shadow,
Like dew or a flash of lightning;
Thus we should perceive them.

All appearances are illusory.
If one sees all appearances as non-appearance,
Then one sees the Tathagata.

If one sees me in forms,
If one seeks me in sounds,
He practices a deviant way,
And cannot see the Tathagata.`
  },
  {
    id: 'amita-sutra',
    title: 'Amitabha Sutra (Excerpt)',
    category: 'sutra',
    content: `At that time, the Buddha told the Elder Shariputra: "Passing from here to the west, beyond ten trillion Buddha lands, there is a world called Ultimate Bliss. In this land there is a Buddha called Amitabha, who is preaching the Dharma right now.

Shariputra, why is that land called Ultimate Bliss? The beings in that land suffer no pain but only enjoy pleasures of various kinds. For this reason, it is called Ultimate Bliss.

Moreover, Shariputra, this Land of Ultimate Bliss is everywhere surrounded by seven tiers of railings, seven layers of netting, and seven rows of trees, all formed from the four treasures. For this reason, it is called Ultimate Bliss."`
  },
  {
    id: 'pumenpin',
    title: 'Universal Gate Chapter (Excerpt)',
    category: 'sutra',
    content: `World Honored One, possessor of all mystic signs,
I now ask you once again,
For what reason is this Buddha's Son,
Named Regarder of the World's Sounds?

The Honored One, possessor of all mystic signs,
Answered Akshayamati in verse:
Listen to the practice of the Regarder of Sounds,
Which is well-responsive to all places.
With vast vows, deep as the ocean,
Passing through kalpas beyond thought,
Attending upon many thousands of millions of Buddhas,
He has made great vows of purity.

I will now tell you in brief,
Hearing his name and seeing his body,
And keeping him in mind, not passing the time in vain,
Will extinguish the suffering of all existence.`
  },
  {
    id: 'great-compassion-mantra',
    title: 'Great Compassion Mantra',
    category: 'mantra',
    content: `Namo Ratna Trayaya.
Namo Arya Valokite Svaraya.
Bodhisattvaya Mahasattvaya Mahakarunikaya.
Om Sarva Ravaye Sudhanadasya.
Namo Skritva Imam Arya Valokite Svara Ramdhava.
Namo Narakindi Hrih Mahavat Svame.
Sarva Arthato Subham Ajeyam.
Sarva Sat Namo Vasat Namo Vaka.
Mavitato. Tadyatha. Om Avaloki Lokate Karate.
E Hrih Mahabodhisattva.
Sarva Sarva Mala Mala.
Mahi Mahi Ridayam.
Kuru Kuru Karmam.
Dhuru Dhuru Vijayate Maha Vijayate.
Dhara Dhara Dharini Svaraya.
Cala Cala Mama Vimala Muktele.
Ehi Ehi Sina Sina.
Arsam Prasali Visa Visam.
Prasaya Hulu Hulu Mara.
Hulu Hulu Hrih.
Sara Sara Siri Siri Suru Suru.
Bodhiya Bodhiya Bodhaya Bodhaya.
Maitreya Narakindi Dhrish nina.
Bhayamana Svaha.
Siddhaya Svaha.
Maha Siddhaya Svaha.
Siddhayoge Svaraya Svaha.
Narakindi Svaha.
Maranara Svaha.
Sira Simha Mukhaya Svaha.
Sarva Maha Asiddhaya Svaha.
Cakra Asiddhaya Svaha.
Padma Kastaya Svaha.
Narakindi Vagalaya Svaha.
Mavari Sankraya Svaha.
Namo Ratna Trayaya.
Namo Arya Valokite Svaraya Svaha.
Om Sidhyantu Mantra Padaya Svaha.`
  },
  {
    id: 'six-syllable',
    title: 'Six-Syllable Mantra',
    category: 'mantra',
    content: `Om Mani Padme Hum`
  },
  {
    id: 'rebirth-mantra',
    title: 'Rebirth Mantra',
    category: 'mantra',
    content: `Namo Amitabhaya Tathagataya.
Tadyatha.
Amrtodbhave.
Amrtasiddhambhave.
Amrtavikrante.
Amrtavikrantagamini.
Gagana Kirtikare Svaha.`
  },
  {
    id: 'medicine-mantra',
    title: 'Medicine Buddha Mantra',
    category: 'mantra',
    content: `Namo Bhagavate Bhaisajya-guru Vaidurya Prabha Rajaya Tathagataya Arhate Samyak-sambuddhaya Tadyatha:
Om Bhaisajye Bhaisajye Bhaisajya-Samudgate Svaha.`
  },
  {
    id: 'name-amita',
    title: 'Namo Amituofo',
    category: 'name',
    content: `Namo Amituofo

(Homage to Amitabha Buddha)`
  },
  {
    id: 'name-guanyin',
    title: 'Namo Guan Shi Yin Pu Sa',
    category: 'name',
    content: `Namo Guan Shi Yin Pu Sa

(Homage to Avalokiteshvara Bodhisattva)`
  },
  {
    id: 'name-dizhang',
    title: 'Namo Di Zhang Wang Pu Sa',
    category: 'name',
    content: `Namo Di Zhang Wang Pu Sa

(Homage to Ksitigarbha Bodhisattva)`
  },
  {
    id: 'changsheng-meditation',
    title: 'Master Changsheng Meditation Guide',
    category: 'meditation',
    content: `[Master Changsheng Meditation Guide]

Please gently close your eyes and relax your whole body.
Let your mind be as calm as a lake in the morning.

Take a deep breath, inhale... exhale...
Feel the energy of the universe flowing slowly from the top of your head to your whole body.
Every cell is breathing, every cell is smiling.

Let go of all worries, let go of all concerns.
At this moment, you are one with the universe.
You are light, you are love, you are compassion.

Sit quietly and observe your breath.
No judgment, no attachment, just observation.
The mind is like the void, embracing all things.

May this peace bring you health and joy of body and mind.
May this compassion be passed on to everyone around you.`
  }
];

export const getScriptures = (lang: Language): Scripture[] => {
  switch (lang) {
    case 'zh-CN':
      return SCRIPTURES_CN;
    case 'zh-TW':
      return SCRIPTURES_TW.length > 0 ? SCRIPTURES_TW : SCRIPTURES_CN; 
    default:
      return SCRIPTURES_EN.length > 0 ? SCRIPTURES_EN : SCRIPTURES_CN;
  }
};

// Default export for backward compatibility
export const SCRIPTURES = SCRIPTURES_CN; 
