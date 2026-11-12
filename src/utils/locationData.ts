// Lightweight, high-performance location dataset to replace heavy 17MB country-state-city package.
// Prevents mobile Safari/iOS memory exhaustion and WebContent crashes.

export interface ICountry {
  name: string;
  isoCode: string;
  flag?: string;
}

export interface ICity {
  name: string;
}

// Complete list of commonly practiced regions and global countries
export const ALL_COUNTRIES: ICountry[] = [
  { name: '中国 (China)', isoCode: 'CN' },
  { name: '马来西亚 (Malaysia)', isoCode: 'MY' },
  { name: '新加坡 (Singapore)', isoCode: 'SG' },
  { name: '中国台湾 (Taiwan)', isoCode: 'TW' },
  { name: '中国香港 (Hong Kong)', isoCode: 'HK' },
  { name: '中国澳门 (Macau)', isoCode: 'MO' },
  { name: '美国 (United States)', isoCode: 'US' },
  { name: '加拿大 (Canada)', isoCode: 'CA' },
  { name: '澳大利亚 (Australia)', isoCode: 'AU' },
  { name: '新西兰 (New Zealand)', isoCode: 'NZ' },
  { name: '日本 (Japan)', isoCode: 'JP' },
  { name: '韩国 (South Korea)', isoCode: 'KR' },
  { name: '英国 (United Kingdom)', isoCode: 'GB' },
  { name: '德国 (Germany)', isoCode: 'DE' },
  { name: '法国 (France)', isoCode: 'FR' },
  { name: '意大利 (Italy)', isoCode: 'IT' },
  { name: '西班牙 (Spain)', isoCode: 'ES' },
  { name: '泰国 (Thailand)', isoCode: 'TH' },
  { name: '越南 (Vietnam)', isoCode: 'VN' },
  { name: '印度尼西亚 (Indonesia)', isoCode: 'ID' },
  { name: '菲律宾 (Philippines)', isoCode: 'PH' },
  { name: '缅甸 (Myanmar)', isoCode: 'MM' },
  { name: '柬埔寨 (Cambodia)', isoCode: 'KH' },
  { name: '老挝 (Laos)', isoCode: 'LA' },
  { name: '印度 (India)', isoCode: 'IN' },
  { name: '尼泊尔 (Nepal)', isoCode: 'NP' },
  { name: '斯里兰卡 (Sri Lanka)', isoCode: 'LK' },
  { name: '不丹 (Bhutan)', isoCode: 'BT' },
  { name: '荷兰 (Netherlands)', isoCode: 'NL' },
  { name: '比利时 (Belgium)', isoCode: 'BE' },
  { name: '瑞士 (Switzerland)', isoCode: 'CH' },
  { name: '奥地利 (Austria)', isoCode: 'AT' },
  { name: '瑞典 (Sweden)', isoCode: 'SE' },
  { name: '挪威 (Norway)', isoCode: 'NO' },
  { name: '丹麦 (Denmark)', isoCode: 'DK' },
  { name: '芬兰 (Finland)', isoCode: 'FI' },
  { name: '爱尔兰 (Ireland)', isoCode: 'IE' },
  { name: '巴西 (Brazil)', isoCode: 'BR' },
  { name: '阿根廷 (Argentina)', isoCode: 'AR' },
  { name: '墨西哥 (Mexico)', isoCode: 'MX' },
  { name: '南非 (South Africa)', isoCode: 'ZA' },
  { name: '阿拉伯联合酋长国 (UAE)', isoCode: 'AE' },
  { name: '沙特阿拉伯 (Saudi Arabia)', isoCode: 'SA' },
  { name: '俄罗斯 (Russia)', isoCode: 'RU' },
  { name: '土耳其 (Turkey)', isoCode: 'TR' },
  { name: '其他国家/地区 (Other)', isoCode: 'OTHER' }
];

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  CN: [
    '北京 (Beijing)', '上海 (Shanghai)', '广州 (Guangzhou)', '深圳 (Shenzhen)', '成都 (Chengdu)',
    '杭州 (Hangzhou)', '武汉 (Wuhan)', '西安 (Xi\'an)', '南京 (Nanjing)', '重庆 (Chongqing)',
    '天津 (Tianjin)', '苏州 (Suzhou)', '长沙 (Changsha)', '郑州 (Zhengzhou)', '东莞 (Dongguan)',
    '青岛 (Qingdao)', '沈阳 (Shenyang)', '宁波 (Ningbo)', '昆明 (Kunming)', '福州 (Fuzhou)',
    '厦门 (Xiamen)', '南昌 (Nanchang)', '大连 (Dalian)', '哈尔滨 (Harbin)', '长春 (Changchun)',
    '合肥 (Hefei)', '济南 (Jinan)', '南宁 (Nanning)', '贵阳 (Guiyang)', '海口 (Haikou)',
    '拉萨 (Lhasa)', '西宁 (Xining)', '银川 (Yinchuan)', '乌鲁木齐 (Urumqi)', '呼和浩特 (Hohhot)',
    '五台山 (Wutai Mountain)', '普陀山 (Putuo Mountain)', '峨眉山 (Emei Mountain)', '九华山 (Jiuhua Mountain)',
    '其他城市 (Other)'
  ],
  MY: [
    '吉隆坡 (Kuala Lumpur)', '雪兰莪 (Selangor / Petaling Jaya)', '槟城 (Penang / George Town)',
    '柔佛新山 (Johor Bahru)', '怡保 (Ipoh / Perak)', '马六甲 (Melaka)', '古晋 (Kuching / Sarawak)',
    '亚庇 (Kota Kinabalu / Sabah)', '关丹 (Kuantan / Pahang)', '森美兰 (Seremban / Negeri Sembilan)',
    '吉打 (Alor Setar / Kedah)', '登嘉楼 (Kuala Terengganu)', '玻璃市 (Kangar / Perlis)',
    '布城 (Putrajaya)', '纳闽 (Labuan)', '其他城市 (Other)'
  ],
  SG: [
    '中央区 (Central)', '滨海湾 (Marina Bay)', '牛车水 (Chinatown)', '乌节路 (Orchard)',
    '裕廊 (Jurong)', '兀兰 (Woodlands)', '淡滨尼 (Tampines)', '实龙岗 (Serangoon)',
    '大巴窑 (Toa Payoh)', '宏茂桥 (Ang Mo Kio)', '勿洛 (Bedok)', '全岛 (All Singapore)'
  ],
  TW: [
    '台北市 (Taipei)', '新北市 (New Taipei)', '台中市 (Taichung)', '高雄市 (Kaohsiung)',
    '台南市 (Tainan)', '桃园市 (Taoyuan)', '新竹市 (Hsinchu)', '基隆市 (Keelung)',
    '嘉义市 (Chiayi)', '花莲县 (Hualien)', '宜兰县 (Yilan)', '台东县 (Taitung)',
    '澎湖/金门/马祖 (Offshore Islands)', '其他城市 (Other)'
  ],
  HK: [
    '中西区 (Central & Western)', '湾仔区 (Wan Chai)', '东区 (Eastern)', '南区 (Southern)',
    '油尖旺区 (Yau Tsim Mong)', '深水埗区 (Sham Shui Po)', '九龙城区 (Kowloon City)',
    '黄大仙区 (Wong Tai Sin)', '观塘区 (Kwun Tong)', '葵青区 (Kwai Tsing)', '荃湾区 (Tsuen Wan)',
    '屯门区 (Tuen Mun)', '元朗区 (Yuen Long)', '沙田区 (Sha Tin)', '大埔区 (Tai Po)',
    '西贡区 (Sai Kung)', '离岛区 (Islands)'
  ],
  MO: [
    '澳门半岛 (Macau Peninsula)', '氹仔 (Taipa)', '路环 (Coloane)', '路氹城 (Cotai)'
  ],
  US: [
    '洛杉矶 (Los Angeles, CA)', '旧金山/湾区 (San Francisco / Bay Area, CA)', '圣荷西 (San Jose, CA)',
    '纽约 (New York, NY)', '西雅图 (Seattle, WA)', '芝加哥 (Chicago, IL)', '休斯顿 (Houston, TX)',
    '达拉斯 (Dallas, TX)', '波士顿 (Boston, MA)', '华盛顿特区 (Washington, D.C.)',
    '拉斯维加斯 (Las Vegas, NV)', '迈阿密 (Miami, FL)', '檀香山 (Honolulu, HI)', '其他城市 (Other)'
  ],
  CA: [
    '温哥华 (Vancouver, BC)', '多伦多 (Toronto, ON)', '蒙特利尔 (Montreal, QC)',
    '卡尔加里 (Calgary, AB)', '埃德蒙顿 (Edmonton, AB)', '渥太华 (Ottawa, ON)', '其他城市 (Other)'
  ],
  AU: [
    '悉尼 (Sydney, NSW)', '墨尔本 (Melbourne, VIC)', '布里斯班 (Brisbane, QLD)',
    '珀斯 (Perth, WA)', '阿德莱德 (Adelaide, SA)', '堪培拉 (Canberra, ACT)', '其他城市 (Other)'
  ],
  NZ: [
    '奥克兰 (Auckland)', '惠灵顿 (Wellington)', '基督城 (Christchurch)', '其他城市 (Other)'
  ],
  JP: [
    '东京 (Tokyo)', '京都 (Kyoto)', '大阪 (Osaka)', '横滨 (Yokohama)', '名古屋 (Nagoya)',
    '福冈 (Fukuoka)', '札幌 (Sapporo)', '神户 (Kobe)', '奈良 (Nara)', '其他城市 (Other)'
  ],
  KR: [
    '首尔 (Seoul)', '釜山 (Busan)', '仁川 (Incheon)', '大邱 (Daegu)', '济州 (Jeju)', '其他城市 (Other)'
  ],
  GB: [
    '伦敦 (London)', '曼彻斯特 (Manchester)', '伯明翰 (Birmingham)', '爱丁堡 (Edinburgh)',
    '剑桥 (Cambridge)', '牛津 (Oxford)', '其他城市 (Other)'
  ],
  TH: [
    '曼谷 (Bangkok)', '清迈 (Chiang Mai)', '普吉 (Phuket)', '芭提雅 (Pattaya)', '其他城市 (Other)'
  ]
};

export const Country = {
  getAllCountries(): ICountry[] {
    return ALL_COUNTRIES;
  }
};

export const City = {
  getCitiesOfCountry(isoCode: string): ICity[] {
    const list = CITIES_BY_COUNTRY[isoCode];
    if (list && list.length > 0) {
      return list.map(name => ({ name }));
    }
    return [
      { name: '主要城市 (Main City)' },
      { name: '其他城市 (Other)' }
    ];
  }
};
