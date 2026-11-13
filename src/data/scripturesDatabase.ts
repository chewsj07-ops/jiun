export interface ScriptureEntry {
  id: string;
  title: string;
  subtitle?: string;
  category: 'sutra' | 'mantra' | 'name' | 'meditation';
  source?: string;
  content: string;
  pinyin?: string;
  explanation?: string;
  keyTakeaway?: string;
  recommendedCount?: number;
  isCustom?: boolean;
}

export const BUDDHIST_SCRIPTURES_DB_CN: ScriptureEntry[] = [
  {
    id: 'heart-sutra',
    title: '般若波罗蜜多心经',
    subtitle: '《心经》',
    category: 'sutra',
    source: '唐·玄奘法师译',
    recommendedCount: 3,
    content: `观自在菩萨，行深般若波罗蜜多时，照见五蕴皆空，度一切苦厄。

舍利子，色不异空，空不异色，色即是空，空即是色，受想行识，亦复如是。

舍利子，是诸法空相，不生不灭，不垢不净，不增不减。

是故空中无色，无受想行识，无眼耳鼻舌身意，无色声香味触法，无眼界，乃至无意识界。

无无明，亦无无明尽，乃至无老死，亦无老死尽。

无苦集灭道，无智亦无得。以无所得故，菩提萨埵，依般若波罗蜜多故，心无挂碍，无挂碍故，无有恐怖，远离颠倒梦想，究竟涅槃。

三世诸佛，依般若波罗蜜多故，得阿耨多罗三藐三菩提。

故知般若波罗蜜多，是大神咒，是大明咒，是无上咒，是无等等咒，能除一切苦，真实不虚。

故说般若波罗蜜多咒，即说咒曰：揭谛揭谛，波罗揭谛，波罗僧揭谛，菩提萨婆诃。`,
    pinyin: `guān zì zài pú sà，xíng shēn bō rě bō luó mì duō shí，zhào jiàn wǔ yùn jiē kōng，dù yī qiè kǔ è。

shè lì zǐ，sè bù yì kōng，kōng bù yì sè，sè jí shì kōng，kōng jí shì sè，shòu xiǎng xíng shí，yì fù rú shì。

shè lì zǐ，shì zhū fǎ kōng xiàng，bù shēng bù miè，bù gòu bù jìng，bù zēng bù jiǎn。

shì gù kōng zhōng wú sè，wú shòu xiǎng xíng shí，wú yǎn ěr bí shé shēn yì，wú sè shēng xiāng wèi chù fǎ，wú yǎn jiè，nǎi zhì wú yì shí jiè。

wú wú míng，yì wú wú míng jìn，nǎi zhì wú lǎo sǐ，yì wú lǎo sǐ jìn。

wú kǔ jí miè dào，wú zhì yì wú dé。yǐ wú suǒ dé gù，pú tí sà duǒ，yī bō rě bō luó mì duō gù，xīn wú guà ài，wú guà ài gù，wú yǒu kǒng bù，yuǎn lí diān dǎo mèng xiǎng，jiū jìng niè pán。

sān shì zhū fó，yī bō rě bō luó mì duō gù，dé ā nòu duō luó sān miǎo sān pú tí。

gù zhī bō rě bō luó mì duō，shì dà shén zhòu，shì dà míng zhòu，shì wú shàng zhòu，shì wú děng děng zhòu，néng chú yī qiè kǔ，zhēn shí bù xū。

gù shuō bō rě bō luó mì duō zhòu，jí shuō zhòu yuē：jiē dì jiē dì，bō luó jiē dì，bō luó sēng jiē dì，pú tí sà pó hē。`,
    explanation: '《心经》全文仅260字，是大乘佛法般若智慧的精华总纲。经文核心阐明“五蕴皆空、色空不二”的实相：世间一切事物皆因缘和合而生、无自性常住，若能以智慧观照透彻，便可放下执着，达到“心无挂碍、无有恐怖、远离颠倒梦想”的自在安乐境界。注：经中“般若”读作 bō rě，“菩提萨婆诃”读作 pú tí sà pó hē。',
    keyTakeaway: '照见五蕴皆空，心无挂碍，无有恐怖。'
  },
  {
    id: 'diamond-sutra-verse',
    title: '金刚般若波罗蜜经（核心精要）',
    subtitle: '《金刚经》',
    category: 'sutra',
    source: '姚秦·鸠摩罗什法师译',
    recommendedCount: 1,
    content: `须菩提！菩萨于法，应无所住，行于布施，所谓不住色布施，不住声香味触法布施。

凡所有相，皆是虚妄。若见诸相非相，则见如来。

应无所住而生其心。

过去心不可得，现在心不可得，未来心不可得。

一切有为法，如梦幻泡影，如露亦如电，应作如是观。

若以色见我，以音声求我，是人行邪道，不能见如来。`,
    pinyin: `xū pú tí！pú sà yú fǎ，yīng wú suǒ zhù，xíng yú bù shī，suǒ wèi bù zhù sè bù shī，bù zhù shēng xiāng wèi chù fǎ bù shī。

fán suǒ yǒu xiàng，jiē shì xū wàng。ruò jiàn zhū xiàng fēi xiàng，zé jiàn rú lái。

yīng wú suǒ zhù ér shēng qí xīn。

guò qù xīn bù kě dé，xiàn zài xīn bù kě dé，wèi lái xīn bù kě dé。

yī qiè yǒu wéi fǎ，rú mèng huàn pào yǐng，rú lù yì rú diàn，yīng zuò rú shì guān。

ruò yǐ sè jiàn wǒ，yǐ yīn shēng qiú wǒ，shì rén xíng xié dào，bù néng jiàn rú lái。`,
    explanation: '《金刚经》以“降伏其心、无住生心”为主旨，教导修行人在日常行事、布施利他时，既要积极入世奉献（生其心），又不要执着于功德、回报与表相（无所住）。全经结尾的“四句偈”将一切因缘生灭之法喻为梦幻泡影与朝露闪电，帮助我们看破虚妄、消融烦恼执着。',
    keyTakeaway: '应无所住而生其心；一切有为法，如梦幻泡影。'
  },
  {
    id: 'amita-sutra',
    title: '佛说阿弥陀经（核心节选）',
    subtitle: '《阿弥陀经》',
    category: 'sutra',
    source: '姚秦·鸠摩罗什法师译',
    recommendedCount: 1,
    content: `尔时，佛告长老舍利弗：从是西方，过十万亿佛土，有世界名曰极乐，其土有佛，号阿弥陀，今现在说法。

舍利弗，彼土何故名为极乐？其国众生，无有众苦，但受诸乐，故名极乐。

又舍利弗。极乐国土，七重栏楯，七重罗网，七重行树，皆是四宝周匝围绕，是故彼国名为极乐。

舍利弗，不可以少善根福德因缘，得生彼国。舍利弗，若有善男子、善女人，闻说阿弥陀佛，执持名号，若一日、若二日、若三日、若四日、若五日、若六日、若七日，一心不乱。其人临命终时，阿弥陀佛，与诸圣众，现在其前。是人终时，心不颠倒，即得往生阿弥陀佛极乐国土。`,
    pinyin: `ěr shí，fó gào zhǎng lǎo shè lì fú：cóng shì xī fāng，guò shí wàn yì fó tǔ，yǒu shì jiè míng yuē jí lè，qí tǔ yǒu fó，hào ā mí tuó，jīn xiàn zài shuō fǎ。

shè lì fú，bǐ tǔ hé gù míng wéi jí lè？qí guó zhòng shēng，wú yǒu zhòng kǔ，dàn shòu zhū lè，gù míng jí lè。

yòu shè lì fú。jí lè guó tǔ，qī chóng lán shǔn，qī chóng luó wǎng，qī chóng háng shù，jiē shì sì bǎo zhōu zā wéi rào，shì gù bǐ guó míng wéi jí lè。

shè lì fú，bù kě yǐ shǎo shàn gēn fú dé yīn yuán，dé shēng bǐ guó。shè lì fú，ruò yǒu shàn nán zǐ、shàn nǚ rén，wén shuō ā mí tuó fó，zhí chí míng hào，ruò yī rì、ruò èr rì、ruò sān rì、ruò sì rì、ruò wǔ rì、ruò liù rì、ruò qī rì，yī xīn bù luàn。qí rén lín mìng zhōng shí，ā mí tuó fó，yǔ zhū shèng zhòng，xiàn zài qí qián。shì rén zhōng shí，xīn bù diān dǎo，jí dé wǎng shēng ā mí tuó fó jí lè guó tǔ。`,
    explanation: '净土宗三经之一，也是佛教晚课日常必诵经典。佛陀在此经中无问自说，描绘西方极乐世界的清净庄严，并指出修行的核心要诀在于积聚善根福德，发愿执持“南无阿弥陀佛”名号直至“一心不乱”，由此安住正念、消业增福、现世安稳而究竟圆成净土。注：“阿弥陀”传统诵读多作 ā mí tuó，“栏楯”读作 lán shǔn。',
    keyTakeaway: '执持名号，一心不乱；诸恶莫作，众善奉行。'
  },
  {
    id: 'pumenpin',
    title: '妙法莲华经 · 观世音菩萨普门品（重颂节选）',
    subtitle: '《普门品》',
    category: 'sutra',
    source: '姚秦·鸠摩罗什法师译',
    recommendedCount: 1,
    content: `世尊妙相具，我今重问彼，佛子何因缘，名为观世音？

具足妙相尊，偈答无尽意：汝听观音行，善应诸方所，弘誓深如海，历劫不思议，侍多千亿佛，发大清净愿。

我为汝略说，闻名及见身，心念不空过，能灭诸有苦。

妙音观世音，梵音海潮音，胜彼世间音，是故须常念。

念念勿生疑，观世音净圣，于苦恼死厄，能为作依怙。

具一切功德，慈眼视众生，福聚海无量，是故应顶礼。`,
    pinyin: `shì zūn miào xiàng jù，wǒ jīn chóng wèn bǐ，fó zǐ hé yīn yuán，míng wéi guān shì yīn？

jù zú miào xiàng zūn，jì dá wú jìn yì：rǔ tīng guān yīn xíng，shàn yìng zhū fāng suǒ，hóng shì shēn rú hǎi，lì jié bù sī yì，shì duō qiān yì fó，fā dà qīng jìng yuàn。

wǒ wèi rǔ lüè shuō，wén míng jí jiàn shēn，xīn niàn bù kōng guò，néng miè zhū yǒu kǔ。

miào yīn guān shì yīn，fàn yīn hǎi cháo yīn，shèng bǐ shì jiān yīn，shì gù xū cháng niàn。

niàn niàn wù shēng yí，guān shì yīn jìng shèng，yú kǔ nǎo sǐ è，néng wéi zuò yī hù。

jù yī qiè gōng dé，cí yǎn shì zhòng shēng，fú jù hǎi wú liàng，shì gù yīng dǐng lǐ。`,
    explanation: '出自《妙法莲华经》第二十五品，详述观世音菩萨大慈大悲、闻声救苦的广大愿力。只要众生在危难困苦或内心焦虑时诚心称念观世音菩萨圣号，就能生起定力与慈悲心，化除恐惧与忧苦。同时亦勉励学佛者效仿菩萨“慈眼视众生”的包容精神。注：“依怙”读作 yī hù。',
    keyTakeaway: '具一切功德，慈眼视众生。'
  },
  {
    id: 'kshitigarbha-sutra',
    title: '地藏菩萨本愿经（赞偈与核心要义）',
    subtitle: '《地藏经》',
    category: 'sutra',
    source: '唐·实叉难陀法师译',
    recommendedCount: 1,
    content: `稽首本然净心地，无尽佛藏大慈尊。
南方世界涌香云，香雨花云及花雨，宝雨宝云无数量，为祥为瑞遍庄严。
天人问佛是何因，佛言地藏菩萨至，三世如来同赞叹，十方菩萨共归依。
我今宿植善因缘，称扬地藏真功德：

慈因积善，誓救众生，手中金锡，振开地狱之门；掌上明珠，光摄大千世界。
智慧音里，吉祥云中，为阎浮提苦众生，作大证明功德主。
大悲大愿，大圣大慈，本尊地藏菩萨摩诃萨。`,
    pinyin: `qǐ shǒu běn rán jìng xīn dì，wú jìn fó zàng dà cí zūn。
nán fāng shì jiè yǒng xiāng yún，xiāng yǔ huā yún jí huā yǔ，bǎo yǔ bǎo yún wú shù liàng，wéi xiáng wéi ruì biàn zhuāng yán。
tiān rén wèn fó shì hé yīn，fó yán dì zàng pú sà zhì，sān shì rú lái tóng zàn tàn，shí fāng pú sà gòng guī yī。
wǒ jīn sù zhí shàn yīn yuán，chēng yáng dì zàng zhēn gōng dé：

cí yīn jī shàn，shì jiù zhòng shēng，shǒu zhōng jīn xī，zhèn kāi dì yù zhī mén；zhǎng shàng míng zhū，guāng shè dà qiān shì jiè。
zhì huì yīn lǐ，jí xiáng yún zhōng，wèi yán fú tí kǔ zhòng shēng，zuò dà zhèng míng gōng dé zhǔ。
dà bēi dà yuàn，dà shèng dà cí，běn zūn dì zàng pú sà mó hē sà。`,
    explanation: '《地藏经》被誉为佛门《孝经》，核心教义在于“孝亲尊师、深信因果、广行善业”。地藏王菩萨曾发“地狱不空，誓不成佛；众生度尽，方证菩提”的宏大誓愿。诵读或随喜赞叹地藏菩萨功德，能启发内心的孝心、担当与怜悯，消除宿业障碍。注：“稽首”读作 qǐ shǒu，“佛藏”读作 fó zàng。',
    keyTakeaway: '孝养父母，深信因果；地狱不空，誓不成佛。'
  },
  {
    id: 'samantabhadra-vows',
    title: '大方广佛华严经 · 普贤菩萨行愿品（十大愿王）',
    subtitle: '《普贤行愿品》',
    category: 'sutra',
    source: '唐·般若法师译',
    recommendedCount: 1,
    content: `一者礼敬诸佛，二者称赞如来，
三者广修供养，四者忏悔业障，
五者随喜功德，六者请转法轮，
七者请佛住世，八者常随佛学，
九者恒顺众生，十者普皆回向。

愿我临欲命终时，尽除一切诸障碍，
面见彼佛阿弥陀，即得往生安乐刹。`,
    pinyin: `yī zhě lǐ jìng zhū fó，èr zhě chēng zàn rú lái，
sān zhě guǎng xiū gōng yǎng，sì zhě chàn huǐ yè zhàng，
wǔ zhě suí xǐ gōng dé，liù zhě qǐng zhuǎn fǎ lún，
qī zhě qǐng fó zhù shì，bā zhě cháng suí fó xué，
jiǔ zhě héng shùn zhòng shēng，shí zhě pǔ jiē huí xiàng。

yuàn wǒ lín yù mìng zhōng shí，jìn chú yī qiè zhū zhàng ài，
miàn jiàn bǐ fó ā mí tuó，jí dé wǎng shēng ān lè chà。`,
    explanation: '普贤菩萨的“十大愿王”是大乘修行人从发心到圆满成佛的行为总纲：礼敬他人即是礼敬诸佛，随喜别人的善行即是拓展自己的福德，忏悔过错即是清净身心，普皆回向即是破除自私我执。每一愿皆可落实于每日的工作、家庭与人际交往中。注：“安乐刹”读作 ān lè chà。',
    keyTakeaway: '随喜功德，忏悔业障，恒顺众生，普皆回向。'
  },
  {
    id: 'eight-realizations-sutra',
    title: '佛说八大人觉经（核心要义）',
    subtitle: '《八大人觉经》',
    category: 'sutra',
    source: '后汉·安世高法师译',
    recommendedCount: 1,
    content: `第一觉悟：世间无常，国土危脆；四大苦空，五阴无我，生灭变异，虚伪无主。
第二觉知：多欲为苦，生死疲劳，从贪欲起；少欲无为，身心自在。
第三觉知：心无厌足，惟得多求，增长罪恶；菩萨不尔，常念知足，安贫守道，惟慧是业。
第四觉知：懈怠坠落；常行精进，破烦恼恶，摧伏四魔，出阴界狱。
第五觉悟：愚痴生死；菩萨常念，广学多闻，增长智慧，成就辩才，教化一切，悉以大乐。
第六觉知：贫苦多怨，横结恶缘；菩萨布施，等念怨亲，不念旧恶，不憎恶人。
第七觉悟：五欲过患；虽为俗人，不染世乐，常念三衣，瓦钵法器，志愿出家，守道清白，梵行高远，慈悲一切。
第八觉知：生死炽然，苦恼无量；发大乘心，普济一切，愿代众生，受无量苦，令诸众生，毕竟大乐。`,
    pinyin: `dì yī jué wù：shì jiān wú cháng，guó tǔ wēi cuì；sì dà kǔ kōng，wǔ yīn wú wǒ，shēng miè biàn yì，xū wěi wú zhǔ。
dì èr jué zhī：duō yù wéi kǔ，shēng sǐ pí láo，cóng tān yù qǐ；shǎo yù wú wéi，shēn xīn zì zài。
dì sān jué zhī：xīn wú yàn zú，wéi dé duō qiú，zēng zhǎng zuì è；pú sà bù ěr，cháng niàn zhī zú，ān pín shǒu dào，wéi huì shì yè。
dì sì jué zhī：xiè dài zhuì luò；cháng xíng jīng jìn，pò fán nǎo è，cuī fú sì mó，chū yīn jiè yù。
dì wǔ jué wù：yú chī shēng sǐ；pú sà cháng niàn，guǎng xué duō wén，zēng zhǎng zhì huì，chéng jiù biàn cái，jiào huà yī qiè，xī yǐ dà lè。
dì liù jué zhī：pín kǔ duō yuàn，héng jié è yuán；pú sà bù shī，děng niàn yuàn qīn，bù niàn jiù è，bù zēng è rén。
dì qī jué wù：wǔ yù guò huàn；suī wéi sú rén，bù rǎn shì lè，cháng niàn sān yī，wǎ bō fǎ qì，zhì yuàn chū jiā，shǒu dào qīng bái，fàn xíng gāo yuǎn，cí bēi yī qiè。
dì bā jué wù：shēng sǐ chì rán，kǔ nǎo wú liàng；fā dà chéng xīn，pǔ jì yī qiè，yuàn dài zhòng shēng，shòu wú liàng kǔ，lìng zhū zhòng shēng，bì jìng dà lè。`,
    explanation: '全经言简意赅，总结了大乘菩萨在世间修行的八项根本觉悟：看破无常、少欲知足、常行精进、广学增慧、平等布施、不染物欲、大心利他。最适合作为现代人每日自我检视与修养德行的座右铭。注：“厌足”此处读作 yàn zú（满足），“瓦钵”读作 wǎ bō。',
    keyTakeaway: '少欲知足，身心自在；等念怨亲，不念旧恶。'
  },
  {
    id: 'mangala-sutta',
    title: '佛说吉祥经（核心节选）',
    subtitle: '《吉祥经》',
    category: 'sutra',
    source: '南传上座部巴利语经典',
    recommendedCount: 1,
    content: `勿近愚痴人，应与智者交，尊敬有德者，是为最吉祥！
多闻工艺精，严持诸禁戒，言谈悦人心，是为最吉祥！
奉养父母亲，爱护妻与子，业业皆无害，是为最吉祥！
布施好品德，帮助众亲眷，行为无瑕疵，是为最吉祥！
邪行须禁止，克己不饮酒，美德坚不移，是为最吉祥！
恭敬与谦让，知足并感恩，及时闻教法，是为最吉祥！
忍耐与顺从，得见众沙门，适时论信仰，是为最吉祥！
触动世间法，心毫不动摇，无忧无污染，是为最吉祥！`,
    pinyin: `wù jìn yú chī rén，yīng yǔ zhì zhě jiāo，zūn jìng yǒu dé zhě，shì wéi zuì jí xiáng！
duō wén gōng yì jīng，yán chí zhū jìn jiè，yán tán yuè rén xīn，shì wéi zuì jí xiáng！
fèng yǎng fù mǔ qīn，ài hù qī yǔ zǐ，yè yè jiē wú hài，shì wéi zuì jí xiáng！
bù shī hǎo pǐn dé，bāng zhù zhòng qīn juàn，xíng wéi wú xiá cī，shì wéi zuì jí xiáng！
xié xíng xū jìn zhǐ，kè jǐ bù yǐn jiǔ，měi dé jiān bù yí，shì wéi zuì jí xiáng！
gōng jìng yǔ qiān ràng，zhī zú bìng gǎn ēn，jí shí wén jiào fǎ，shì wéi zuì jí xiáng！
rěn nài yǔ shùn cóng，dé jiàn zhòng shā mén，shì shí lùn xìn yǎng，shì wéi zuì jí xiáng！
chù dòng shì jiān fǎ，xīn háo bù dòng yáo，wú yōu wú wū rǎn，shì wéi zuì jí xiáng！`,
    explanation: '《吉祥经》是佛陀回答天神“何为世间最吉祥之事”的著名开示。经中不谈玄虚，而是立足现实生活：亲近良师益友、精进本业、孝敬父母、关爱家人、谦逊感恩、知足不傲，以及在顺逆境中保持内心安稳不动摇——这才是真正的护身福德与大吉祥。',
    keyTakeaway: '恭敬与谦让，知足并感恩；心毫不动摇，是为最吉祥。'
  },
  {
    id: 'great-compassion-mantra',
    title: '大悲咒（千手千眼观世音菩萨大悲心陀罗尼）',
    subtitle: '《大悲咒》',
    category: 'mantra',
    source: '唐·伽梵达摩法师译',
    recommendedCount: 7,
    content: `南无、喝啰怛那、哆啰夜耶，南无、阿唎耶，婆卢羯帝、烁钵啰耶，菩提萨埵婆耶，摩诃萨埵婆耶，摩诃、迦卢尼迦耶。
唵，萨皤啰罚曳，数怛那怛写。

南无、悉吉栗埵、伊蒙阿唎耶，婆卢吉帝、室佛啰楞驮婆。
南无、那啰谨墀，醯利摩诃、皤哆沙咩，萨婆阿他、豆输朋，阿逝孕，萨婆萨哆、那摩婆萨哆，那摩婆伽，摩罚特豆。

怛侄他。唵，阿婆卢醯、卢迦帝、迦罗帝、夷醯唎，摩诃菩提萨埵，萨婆萨婆，摩啰摩啰，摩醯摩醯、唎驮孕，俱卢俱卢、羯蒙，度卢度卢、罚阇耶帝，摩诃罚阇耶帝。

陀啰陀啰，地唎尼，室佛啰耶，遮啰遮啰，摩么罚摩啰，穆帝隶，伊醯伊醯，室那室那，阿啰嘇、佛啰舍利，罚沙罚嘇，佛啰舍耶。

呼嚧呼嚧摩啰，呼嚧呼嚧醯利，娑啰娑啰，悉唎悉唎，苏嚧苏嚧，菩提夜、菩提夜，菩驮夜、菩驮夜，弥帝唎夜，那啰谨墀，地利瑟尼那，波夜摩那，娑婆诃。`,
    pinyin: `ná mó、hé là dá nà、duō là yè yē，ná mó、ā lì yē，pó lú jié dì、shuò bō là yē，pú tí sà duǒ pó yē，mó hē sà duǒ pó yē，mó hē、jiā lú ní jiā yē。
ōng，sà pó là fá yì，shù dá nà dá xiě。

ná mó、xī jí lì duǒ、yī méng ā lì yē，pó lú jí dì、shì fó là léng tuó pó。
ná mó、nà là jǐn chí，xī lì mó hē、pó duō shā miē，sà pó ā tā、dòu shū péng，ā shì yùn，sà pó sà duǒ、nà mó pó sà duǒ，nà mó pó qié，mó fá tè dòu。

dá zhí tā。ōng，ā pó lú xī、lú jiā dì、jiā luó dì、yí xī lì，mó hē pú tí sà duǒ，sà pó sà pó，mó là mó là，mó xī mó xī、lì tuó yùn，jù lú jù lú、jié méng，dù lú dù lú、fá shé yē dì，mó hē fá shé yē dì。

tuó là tuó là，dì lì ní，shì fó là yē，zhē là zhē là，mó mó fá mó là，mù dì lì，yī xī yī xī，shì nà shì nà，ā là shēn、fó là shě lì，fá shā fá shēn，fó là shě yē。

hū lú hū lú mó là，hū lú hū lú xī lì，suō là suō là，xī lì xī lì，sū lú sū lú，pú tí yè、pú tí yè，pú tuó yè、pú tuó yè，mí dì lì yè，nà là jǐn chí，dì lì sè ní nà，bō yè mó nà，suō pó hē。（节选前半段，完整版共84句）`,
    explanation: '汉传佛教最广为传诵的观音神咒。修持大悲咒贵在生起“大慈悲心、平等心、无为心、无染着心”。常以恭敬清净之心持诵，可增进身心安稳、化解焦虑与违缘，并将悲心功德回向给一切苦难众生。',
    keyTakeaway: '以大慈悲心、平等心受持，安稳身心、利乐有情。'
  },
  {
    id: 'six-syllable',
    title: '六字大明咒',
    subtitle: '观世音菩萨心咒',
    category: 'mantra',
    source: '《大乘庄严宝王经》',
    recommendedCount: 108,
    content: `唵 嘛 呢 叭 咪 吽

(Oṃ Maṇi Padme Hūṃ)`,
    pinyin: `ōng ma nī bēi mēi hōng
（梵音：Oṃ Maṇi Padme Hūṃ）`,
    explanation: '观世音菩萨微妙心印，简称六字真言。“唵”象征清净佛身口意，“嘛呢”意为如意宝珠（象征慈悲方便），“叭咪”意为清净莲花（象征出离尘染的智慧），“吽”象征悲智双运、祈愿成就。念诵此咒能清净六道烦恼习气，是最简便易行的日常定课。',
    keyTakeaway: '莲花无染之智，宝珠利他之悲，悲智双运。'
  },
  {
    id: 'rebirth-mantra',
    title: '往生净土神咒（往生咒）',
    subtitle: '《拔一切业障根本得生净土陀罗尼》',
    category: 'mantra',
    source: '刘宋·求那跋陀罗译',
    recommendedCount: 21,
    content: `南无阿弥多婆夜。哆他伽多夜。哆地夜他。
阿弥利都婆毗。阿弥利哆。悉耽婆毗。
阿弥唎哆。毗迦兰帝。阿弥唎哆。毗迦兰多。
伽弥腻。伽伽那。枳多迦利。娑婆诃。`,
    pinyin: `ná mó ā mí duō pó yè。duō tā qié duō yè。duō dì yè tā。
ā mí lì dū pó pí。ā mí lì duō。xī dān pó pí。
ā mí lì duō。pí jiā lán dì。ā mí lì duō。pí jiā lán duō。
qié mí nì。qié qié nà。zhǐ duō jiā lì。suō pó hē。`,
    explanation: '净土宗重要咒语，旨在拔除宿世业障、增进福慧、祈愿亡者或如母有情离苦得乐。日常生活中若遇不慎伤害小生命、或纪念追思先人时，常诚心诵持此咒并回向。注：“枳”读作 zhǐ，“毗”读作 pí。',
    keyTakeaway: '拔除业障，增长善根，祈愿一切生灵安乐。'
  },
  {
    id: 'medicine-mantra',
    title: '药师灌顶真言（药师咒）',
    subtitle: '《药师如来心咒》',
    category: 'mantra',
    source: '《药师琉璃光如来本愿功德经》',
    recommendedCount: 21,
    content: `南谟薄伽伐帝。鞞杀社。窭噜薜琉璃。钵喇婆。喝啰阇也。
怛他揭多也。阿啰喝帝。三藐三勃陀耶。怛侄他。
唵。鞞杀逝。鞞杀逝。鞞杀社。三没揭帝莎诃。`,
    pinyin: `ná mó bó qié fá dì。pí shā shè。jù lǔ bì liú lí。bō là pó。hé là shé yě。
dá tā jiē duō yě。ā là hē dì。sān miǎo sān bó tuó yě。dá zhí tā。
ōng。pí shā shì。pí shā shì。pí shā shè。sān mò jiē dì suō hē。`,
    explanation: '药师琉璃光如来为拔除众生身心疾苦、满众生愿而宣说的真言。“鞞杀逝”意为妙药、良医。当自身或亲友身体不适、身心疲惫时，静心持诵药师咒并保持积极疗愈之心，可令内心平和安定、消灾延寿。注：“鞞”读作 pí，“窭”读作 jù，“薜”读作 bì，“阇”读作 shé。',
    keyTakeaway: '消除身心疾苦，祈愿健康安泰，身心清凉。'
  },
  {
    id: 'cundi-mantra',
    title: '准提神咒',
    subtitle: '《七俱胝佛母准提大明陀罗尼》',
    category: 'mantra',
    source: '唐·地婆诃罗译 /《显密圆通成佛心要》',
    recommendedCount: 21,
    content: `稽首皈依苏悉帝，头面顶礼七俱胝，
我今称赞大准提，惟愿慈悲垂加护。
南无飒哆喃，三藐三勃陀，俱胝喃，怛侄他，
唵，折隶、主隶、准提，娑婆诃。`,
    pinyin: `qǐ shǒu guī yī sū xī dì，tóu miàn dǐng lǐ qī jù zhī，
wǒ jīn chēng zàn dà zhǔn tí，wéi yuàn cí bēi chuí jiā hù。
ná mó sà duō nán，sān miǎo sān bó tuó，jù zhī nán，dá zhí tā，
ōng，zhé lì、zhǔ lì、zhǔn tí，suō pó hē。`,
    explanation: '禅宗早课十小咒之一，也是在家居士最宜受持的咒语之一。准提咒不拘时间、地点与素食与否，唯求心诚清净，能开启智慧、成就正当善良的事业与愿景，护持心志坚定。注：“俱胝”读作 jù zhī，“飒”读作 sà。',
    keyTakeaway: '清净心念，启发慧命，护持正善之愿。'
  },
  {
    id: 'seven-buddhas-mantra',
    title: '七佛灭罪真言',
    subtitle: '灭罪真言',
    category: 'mantra',
    source: '《大方等陀罗尼经》',
    recommendedCount: 21,
    content: `离婆离婆帝。求诃求诃帝。陀罗尼帝。尼诃啰帝。
毗黎你帝。摩诃伽帝。真陵乾帝。莎婆诃。`,
    pinyin: `lí pó lí pó dì。qiú hē qiú hē dì。tuó luó ní dì。ní hē là dì。
pí lí nǐ dì。mó hē qié dì。zhēn líng qián dì。suō pó hē。`,
    explanation: '过去七佛所共宣说之真言，也是晚课常用的忏悔真言。修行难免起心动念有过失，配合真诚忏悔之心念诵此咒，立志改过迁善、不再重犯，心境自能轻安清净。注：“诃”读作 hē，“乾”读作 qián。',
    keyTakeaway: '真诚忏悔，改过自新，心得轻安。'
  },
  {
    id: 'name-amita',
    title: '南无阿弥陀佛',
    subtitle: '阿弥陀佛圣号',
    category: 'name',
    source: '净土法门根本圣号',
    recommendedCount: 108,
    content: `南无阿弥陀佛

(Namo Amituofo)`,
    pinyin: `ná mó ā mí tuó fó`,
    explanation: '“南无”意为恭敬礼拜、归命依止；“阿弥陀”意为“无量光”与“无量寿”，象征无尽的智慧光明与慈悲寿命。句句清晰念出或默念，把散乱的心念收摄回来，是最简易殊胜的定心法门。',
    keyTakeaway: '一念清净，即是无量光明与安乐。'
  },
  {
    id: 'name-guanyin',
    title: '南无大慈大悲观世音菩萨',
    subtitle: '观音菩萨圣号',
    category: 'name',
    source: '《妙法莲华经》',
    recommendedCount: 108,
    content: `南无大慈大悲观世音菩萨

(Namo Guan Shi Yin Pu Sa)`,
    pinyin: `ná mó dà cí dà bēi guān shì yīn pú sà`,
    explanation: '观世音菩萨代表无尽的慈悲与聆听。遇到烦躁、焦虑、家庭或工作困境时，轻声称念菩萨圣号，不仅祈请慈悲护佑，更是在提醒自己学习菩萨的温柔、耐心与利他心怀。',
    keyTakeaway: '千处祈求千处应，常怀大悲利人心。'
  },
  {
    id: 'name-dizhang',
    title: '南无大愿地藏王菩萨',
    subtitle: '地藏菩萨圣号',
    category: 'name',
    source: '《地藏菩萨本愿经》',
    recommendedCount: 108,
    content: `南无大愿地藏王菩萨

(Namo Di Zhang Wang Pu Sa)`,
    pinyin: `ná mó dà yuàn dì zàng wáng pú sà`,
    explanation: '地藏菩萨以大愿、大孝闻名。大地能承载万物，心如大地般厚重安稳，能包容艰难并勇于承担责任。称念此圣号可增长孝心、毅力与清净心。',
    keyTakeaway: '心如大地，厚德载物，孝亲尊师。'
  },
  {
    id: 'name-shakyamuni',
    title: '南无本师释迦牟尼佛',
    subtitle: '释迦牟尼佛圣号',
    category: 'name',
    source: '娑婆世界教主圣号',
    recommendedCount: 108,
    content: `南无本师释迦牟尼佛

(Namo Shakyamuni Buddha)`,
    pinyin: `ná mó běn shī shì jiā móu ní fó`,
    explanation: '释迦牟尼佛是我们这个世界的根本导师，“释迦”意为能仁（慈悲），“牟尼”意为寂默（智慧）。称念佛号即是在感念佛陀觉悟真理、传授离苦得乐正法的恩德。',
    keyTakeaway: '能仁寂默，悲智圆满，依教奉行。'
  },
  {
    id: 'dedication-verse',
    title: '普皆回向偈',
    subtitle: '每日课诵结束回向文',
    category: 'sutra',
    source: '《观无量寿佛经》/ 佛教常规晚课',
    recommendedCount: 1,
    content: `愿以此功德，庄严佛净土。
上报四重恩，下济三途苦。
若有见闻者，悉发菩提心。
尽此一报身，同生极乐国。`,
    pinyin: `yuàn yǐ cǐ gōng dé，zhuāng yán fó jìng tǔ。
shàng bào sì chóng ēn，xià jì sān tú kǔ。
ruò yǒu jiàn wén zhě，xī fā pú tí xīn。
jìn cǐ yī bào shēn，tóng shēng jí lè guó。`,
    explanation: '每次诵经、打坐或行善结束后的总结回向。“四重恩”指父母恩、众生恩、国土恩、三宝恩。回向的意义在于不把修行的功德占为己有，而是分享给家人与一切有情众生，以此破除我执、心胸越发宽广。',
    keyTakeaway: '功德不自私，回向一切有情。'
  },
  {
    id: 'repentance-verse',
    title: '忏悔偈',
    subtitle: '礼佛清净忏悔文',
    category: 'sutra',
    source: '《华严经·普贤行愿品》',
    recommendedCount: 3,
    content: `往昔所造诸恶业，皆由无始贪嗔痴，
从身语意之所生，一切我今皆忏悔。`,
    pinyin: `wǎng xī suǒ zào zhū è yè，jiē yóu wú shǐ tān chēn chī，
cóng shēn yǔ yì zhī suǒ shēng，yī qiè wǒ jīn jiē chàn huǐ。`,
    explanation: '短短四句，直指烦恼根源：贪婪、嗔恨与愚痴（执迷不悟），并通过身体行为、言语表达和内心念头表现出来。真诚念诵此偈，不是自我否定或自责，而是勇敢觉察并放下过去错误，发愿从当下重新开始。',
    keyTakeaway: '觉察身口意过失，真诚忏悔，重获清净。'
  },
  {
    id: 'changsheng-meditation',
    title: '长生老师禅修引导',
    subtitle: '静坐呼吸正念指南',
    category: 'meditation',
    source: '正念静坐引导',
    recommendedCount: 1,
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
愿这份慈悲，传递给身边的每一个人。`,
    pinyin: `qǐng dà jiā qīng qīng hé shàng shuāng yǎn，quán shēn fàng sōng。
ràng nǐ de xīn，xiàng qīng chén de hú miàn yī yàng píng jìng。
shēn hū xī，xī qì…… hū qì……
jìng jìng dì zuò zhe，guān chá nǐ de hū xī，bù píng pàn，bù zhí zhuó。`,
    explanation: '适合初学或每日睡前进行的静心观息引导词。通过全身扫描放松、深缓呼吸与无评判地觉察念头，帮助神经系统脱离紧张与内耗，回归当下的安宁与慈悲。',
    keyTakeaway: '不评判，不执着，只是温柔地观察呼吸。'
  }
];
