// ==UserScript==
// @id          iitc-plugin-Konjakumap
// @name        IITC plugin: Konjakumap
// @category    Layer
// @version     0.2.0
// @namespace   https://github.com/IITC-CE/ingress-intel-total-conversion
// @updateURL   https://gitlab.com/mklyr/Plugin/raw/main/kjmaplayer-all.user.js
// @downloadURL https://gitlab.com/mklyr/Plugin/raw/main/kjmaplayer-all.user.js
// @description IITCに今昔マップのレイヤーを表示させます
// @match       https://intel.ingress.com/*
// @match       https://intel-x.ingress.com/*
// @grant       none
// ==/UserScript==

function wrapper(plugin_info) {
    if (typeof window.plugin !== 'function') window.plugin = function() {};

    // ----------------------------------------------------
    // プラグイン用名前空間
    window.plugin.KjmapLayer = {};

    // localStorage に保存するキー
    var STORAGE_KEY = 'KjmapLayer-option-all';
    // オプション保持用オブジェクト
    var OptionData = {
        dataset: '',     // データセットフォルダ名（例: "tokyo50"）
        period: '',      // 時期フォルダID（例: "00"）
        opacity: 5       // 0〜10 の範囲で保存（実際は /10 して 0.0〜1.0 の不透明度に）
    };

    // Leaflet のタイルレイヤ参照
    var TileLayerKjmap = null;

    // ----------------------------------------------------
    // tilemapservice.html に記載の全59地域+時期フォルダをオブジェクト化
    // 【一次情報】データセット一覧と時期フォルダ一覧 :contentReference[oaicite:0]{index=0}
    window.plugin.KjmapLayer.datasets = {
        tokyo50: {
            label: '首都圏',
            periods: [
                { id: '2man', label: '1896-1909年 (2万分の1)' },
                { id: '00',   label: '1917-1924年' },
                { id: '01',   label: '1927-1939年' },
                { id: '02',   label: '1944-1954年' },
                { id: '03',   label: '1965-1968年' },
                { id: '04',   label: '1975-1978年' },
                { id: '05',   label: '1983-1987年' },
                { id: '06',   label: '1992-1995年' },
                { id: '07',   label: '1998-2005年' }
            ]
        },
        chukyo: {
            label: '中京圏',
            periods: [
                { id: '2man', label: '1888-1898年 (2万分の1)' },
                { id: '00',   label: '1920年' },
                { id: '01',   label: '1932年' },
                { id: '02',   label: '1937-1938年' },
                { id: '03',   label: '1947年' },
                { id: '04',   label: '1959-1960年' },
                { id: '05',   label: '1968-1973年' },
                { id: '06',   label: '1976-1980年' },
                { id: '07',   label: '1984-1989年' },
                { id: '08',   label: '1992-1996年' }
            ]
        },
        keihansin: {
            label: '京阪神圏',
            periods: [
                { id: '2man', label: '1892-1910年 (2万分の1)' },
                { id: '00',   label: '1922-1923年' },
                { id: '01',   label: '1927-1935年' },
                { id: '02',   label: '1947-1950年' },
                { id: '03',   label: '1954-1956年' },
                { id: '03x',  label: '1961-1964年 (3x)' },
                { id: '04',   label: '1967-1970年' },
                { id: '05',   label: '1975-1979年' },
                { id: '06',   label: '1983-1988年' },
                { id: '07',   label: '1993-1997年' }
            ]
        },
        sapporo: {
            label: '札幌',
            periods: [
                { id: '00', label: '1916年' },
                { id: '01', label: '1935年' },
                { id: '02', label: '1950-1952年' },
                { id: '03', label: '1975-1976年' },
                { id: '04', label: '1995-1998年' }
            ]
        },
        sendai: {
            label: '仙台',
            periods: [
                { id: '00', label: '1928-1933年' },
                { id: '01', label: '1946年' },
                { id: '02', label: '1963-1967年' },
                { id: '03', label: '1977-1978年' },
                { id: '04', label: '1995-2000年' }
            ]
        },
        hiroshima: {
            label: '広島',
            periods: [
                { id: '2man', label: '1894-1899年 (2万分の1)' },
                { id: '00',   label: '1925-1932年' },
                { id: '01',   label: '1950-1954年' },
                { id: '02',   label: '1967-1969年' },
                { id: '03',   label: '1984-1990年' },
                { id: '04',   label: '1992-2001年' }
            ]
        },
        fukuoka: {
            label: '福岡・北九州',
            periods: [
                { id: '00', label: '1922-1926年' },
                { id: '01', label: '1936-1938年' },
                { id: '02', label: '1948-1956年' },
                { id: '03', label: '1967-1972年' },
                { id: '04', label: '1982-1986年' },
                { id: '05', label: '1991-2000年' }
            ]
        },
        tohoku_pacific_coast: {
            label: '東北地方太平洋岸',
            periods: [
                { id: '00', label: '1901-1913年' },
                { id: '01', label: '1949-1953年' },
                { id: '02', label: '1969-1982年' },
                { id: '03', label: '1990-2008年' }
            ]
        },
        kanto: {
            label: '関東',
            periods: [
                { id: '00', label: '1894-1915年' },
                { id: '01', label: '1928-1945年' },
                { id: '02', label: '1972-1982年' },
                { id: '03', label: '1988-2008年' }
            ]
        },
        okinawas: {
            label: '沖縄本島南部',
            periods: [
                { id: '00', label: '1919年' },
                { id: '01', label: '1973-1975年' },
                { id: '02', label: '1992-1994年' },
                { id: '03', label: '2005-2008年' }
            ]
        },
        hamamatsu: {
            label: '浜松・豊橋',
            periods: [
                { id: '2man', label: '1889-1890年 (2万分の1)' },
                { id: '00',   label: '1916-1918年' },
                { id: '01',   label: '1938-1950年' },
                { id: '02',   label: '1956-1959年' },
                { id: '03',   label: '1975-1988年' },
                { id: '04',   label: '1988-1995年' },
                { id: '05',   label: '1996-2010年' }
            ]
        },
        kumamoto: {
            label: '熊本',
            periods: [
                { id: '2man', label: '1900-1901年 (2万分の1)' },
                { id: '00',   label: '1926年' },
                { id: '01',   label: '1965-1971年' },
                { id: '02',   label: '1983年' },
                { id: '03',   label: '1998-2000年' }
            ]
        },
        niigata: {
            label: '新潟',
            periods: [
                { id: '00', label: '1910-1911年' },
                { id: '01', label: '1930-1931年' },
                { id: '02', label: '1966-1968年' },
                { id: '03', label: '1980-1988年' },
                { id: '04', label: '1997-2001年' }
            ]
        },
        himeji: {
            label: '姫路',
            periods: [
                { id: '2man', label: '1903-1910年 (2万分の1)' },
                { id: '00',   label: '1923年' },
                { id: '01',   label: '1967年' },
                { id: '02',   label: '1981-1985年' },
                { id: '03',   label: '1997-2001年' }
            ]
        },
        okayama: {
            label: '岡山・福山',
            periods: [
                { id: '2man', label: '1895-1898年 (2万分の1)' },
                { id: '00',   label: '1925年' },
                { id: '01',   label: '1965-1970年' },
                { id: '02',   label: '1978-1988年' },
                { id: '03',   label: '1990-2000年' }
            ]
        },
        kagoshima: {
            label: '鹿児島',
            periods: [
                { id: '5man', label: '1902年 (5万分の1)' },
                { id: '2man', label: '1902年 (2万分の1)' },
                { id: '00',   label: '1932年' },
                { id: '01',   label: '1966年' },
                { id: '02',   label: '1982-1983年' },
                { id: '03',   label: '1996-2001年' }
            ]
        },
        matsuyama: {
            label: '松山',
            periods: [
                { id: '2man', label: '1903年 (2万分の1)' },
                { id: '00',   label: '1928-1955年' },
                { id: '01',   label: '1968年' },
                { id: '02',   label: '1985年' },
                { id: '03',   label: '1998-1999年' }
            ]
        },
        oita: {
            label: '大分',
            periods: [
                { id: '00', label: '1914年' },
                { id: '01', label: '1973年' },
                { id: '02', label: '1984-1986年' },
                { id: '03', label: '1997-2001年' }
            ]
        },
        nagasaki: {
            label: '長崎',
            periods: [
                { id: '2man', label: '1900-1901年 (2万分の1)' },
                { id: '00',   label: '1924-1926年' },
                { id: '01',   label: '1954年' },
                { id: '02',   label: '1970年' },
                { id: '03',   label: '1982-1983年' },
                { id: '03',   label: '1996-2000年' } // 同一 ID だが別年度の扱い
            ]
        },
        kanazawa: {
            label: '金沢・富山',
            periods: [
                { id: '2man', label: '1909-1910年 (2万分の1)' },
                { id: '00',   label: '1930年' },
                { id: '01',   label: '1968-1969年' },
                { id: '02',   label: '1981-1985年' },
                { id: '03',   label: '1994-2001年' }
            ]
        },
        wakayama: {
            label: '和歌山',
            periods: [
                { id: '2man', label: '1908-1912年 (2万分の1)' },
                { id: '00',   label: '1934年' },
                { id: '01',   label: '1947年' },
                { id: '02',   label: '1966-1967年' },
                { id: '03',   label: '1984-1985年' },
                { id: '04',   label: '1998-2000年' }
            ]
        },
        aomori: {
            label: '青森',
            periods: [
                { id: '00', label: '1912年' },
                { id: '01', label: '1939-1955年' },
                { id: '02', label: '1970年' },
                { id: '03', label: '1984-1989年' },
                { id: '04', label: '2003-2011年' }
            ]
        },
        takamatsu: {
            label: '高松',
            periods: [
                { id: '2man', label: '1896-1910年 (2万分の1)' },
                { id: '00',   label: '1928年' },
                { id: '01',   label: '1969年' },
                { id: '02',   label: '1983-1984年' },
                { id: '03',   label: '1990-2000年' }
            ]
        },
        nagano: {
            label: '長野',
            periods: [
                { id: '00', label: '1912年' },
                { id: '01', label: '1937年' },
                { id: '02', label: '1960年' },
                { id: '03', label: '1972-1973年' },
                { id: '04', label: '1985年' },
                { id: '05', label: '2001年' }
            ]
        },
        fukushima: {
            label: '福島',
            periods: [
                { id: '00', label: '1908年' },
                { id: '01', label: '1931年' },
                { id: '02', label: '1972-1973年' },
                { id: '03', label: '1983年' },
                { id: '04', label: '1996-2000年' }
            ]
        },
        fukui: {
            label: '福井',
            periods: [
                { id: '2man', label: '1909年 (2万分の1)' },
                { id: '00',   label: '1930年' },
                { id: '01',   label: '1969-1973年' },
                { id: '02',   label: '1988-1990年' },
                { id: '03',   label: '1996-2000年' }
            ]
        },
        akita: {
            label: '秋田',
            periods: [
                { id: '00', label: '1912年' },
                { id: '01', label: '1971-1972年' },
                { id: '02', label: '1985-1990年' },
                { id: '03', label: '2006-2007年' }
            ]
        },
        morioka: {
            label: '盛岡',
            periods: [
                { id: '00', label: '1811-1912年' },
                { id: '01', label: '1939年' },
                { id: '02', label: '1968-1969年' },
                { id: '03', label: '1983-1988年' },
                { id: '04', label: '1999-2002年' }
            ]
        },
        tottori: {
            label: '鳥取',
            periods: [
                { id: '2man', label: '1897年 (2万分の1)' },
                { id: '00',   label: '1932年' },
                { id: '01',   label: '1973年' },
                { id: '02',   label: '1988年' },
                { id: '03',   label: '1999-2001年' }
            ]
        },
        tokushima: {
            label: '徳島',
            periods: [
                { id: '2man', label: '1896-1909年 (2万分の1)' },
                { id: '00',   label: '1917年' },
                { id: '01',   label: '1928-1934年' },
                { id: '02',   label: '1969-1970年' },
                { id: '03',   label: '1981-1987年' },
                { id: '04',   label: '1997-2000年' }
            ]
        },
        kochi: {
            label: '高知',
            periods: [
                { id: '2man', label: '1906-1907年 (2万分の1)' },
                { id: '00',   label: '1933年' },
                { id: '01',   label: '1965年' },
                { id: '02',   label: '1982年' },
                { id: '03',   label: '1998-2003年' }
            ]
        },
        miyazaki: {
            label: '宮崎',
            periods: [
                { id: '00', label: '1902年' },
                { id: '01', label: '1935年' },
                { id: '02', label: '1962年' },
                { id: '03', label: '1979年' },
                { id: '04', label: '1999-2001年' }
            ]
        },
        yamagata: {
            label: '山形',
            periods: [
                { id: '2man', label: '1901-1903年 (2万分の1)' },
                { id: '00',   label: '1931年' },
                { id: '01',   label: '1970年' },
                { id: '02',   label: '1980-1989年' },
                { id: '03',   label: '1999-2001年' }
            ]
        },
        saga: {
            label: '佐賀・久留米',
            periods: [
                { id: '2man', label: '1900-1911年 (2万分の1)' },
                { id: '00',   label: '1914-1926年' },
                { id: '01',   label: '1931-1940年' },
                { id: '02',   label: '1958-1964年' },
                { id: '03',   label: '1977-1982年' },
                { id: '04',   label: '1998-2001年' }
            ]
        },
        matsue: {
            label: '松江・米子',
            periods: [
                { id: '00', label: '1915年' },
                { id: '01', label: '1934年' },
                { id: '02', label: '1975年' },
                { id: '03', label: '1989-1990年' },
                { id: '04', label: '1997-2003年' }
            ]
        },
        tsu: {
            label: '津',
            periods: [
                { id: '2man', label: '1892-1898年 (2万分の1)' },
                { id: '00',   label: '1920年' },
                { id: '01',   label: '1937年' },
                { id: '02',   label: '1959年' },
                { id: '03',   label: '1980-1982年' },
                { id: '04',   label: '1991-1999年' }
            ]
        },
        yamaguchi: {
            label: '山口',
            periods: [
                { id: '2man', label: '1897-1909年 (2万分の1)' },
                { id: '00',   label: '1922-1927年' },
                { id: '01',   label: '1936-1951年' },
                { id: '02',   label: '1969年' },
                { id: '03',   label: '1983-1989年' },
                { id: '04',   label: '2000-2001年' }
            ]
        },
        asahikawa: {
            label: '旭川',
            periods: [
                { id: '00', label: '1916-1917年' },
                { id: '01', label: '1950-1952年' },
                { id: '02', label: '1972-1974年' },
                { id: '03', label: '1986年' },
                { id: '04', label: '1999-2001年' }
            ]
        },
        hakodate: {
            label: '函館',
            periods: [
                { id: '00', label: '1915-1919年' },
                { id: '01', label: '1951-1955年' },
                { id: '02', label: '1968年' },
                { id: '03', label: '1986-1989年' },
                { id: '04', label: '1996-2001年' }
            ]
        },
        matsumoto: {
            label: '松本',
            periods: [
                { id: '00', label: '1910年' },
                { id: '01', label: '1931年' },
                { id: '02', label: '1974-1975年' },
                { id: '03', label: '1987-1992年' },
                { id: '04', label: '1996-2001年' }
            ]
        },
        sasebo: {
            label: '佐世保',
            periods: [
                { id: '2man', label: '1900-1901年 (2万分の1)' },
                { id: '00',   label: '1924年' },
                { id: '01',   label: '1971年' },
                { id: '02',   label: '1985-1987年' },
                { id: '03',   label: '1997-1998年' }
            ]
        },
        hirosaki: {
            label: '弘前',
            periods: [
                { id: '00', label: '1912年' },
                { id: '01', label: '1939年' },
                { id: '02', label: '1970-1971年' },
                { id: '03', label: '1980-1986年' },
                { id: '04', label: '1994-1997年' }
            ]
        },
        aizu: {
            label: '会津',
            periods: [
                { id: '00', label: '1908-1910年' },
                { id: '01', label: '1931年' },
                { id: '02', label: '1972-1975年' },
                { id: '03', label: '1988-1991年' },
                { id: '04', label: '1997-2000年' }
            ]
        },
        kushiro: {
            label: '釧路',
            periods: [
                { id: '00', label: '1897年' },
                { id: '01', label: '1922年' },
                { id: '02', label: '1958年' },
                { id: '03', label: '1981年' },
                { id: '04', label: '2001年' }
            ]
        },
        tomakomai: {
            label: '苫小牧',
            periods: [
                { id: '00', label: '1896年' },
                { id: '01', label: '1935年' },
                { id: '02', label: '1954-1955年' },
                { id: '03', label: '1983-1984年' },
                { id: '04', label: '1993-1999年' }
            ]
        },
        obihiro: {
            label: '帯広',
            periods: [
                { id: '00', label: '1896年' },
                { id: '01', label: '1930年' },
                { id: '02', label: '1956-1957年' },
                { id: '03', label: '1985年' },
                { id: '04', label: '1998-2000年' }
            ]
        },
        miyakonojyou: {
            label: '都城',
            periods: [
                { id: '00', label: '1902年' },
                { id: '01', label: '1932年' },
                { id: '02', label: '1966年' },
                { id: '03', label: '1979-1980年' },
                { id: '04', label: '1998-2001年' }
            ]
        },
        toyo: {
            label: '東予',
            periods: [
                { id: '00', label: '1898-1906年' },
                { id: '01', label: '1928年' },
                { id: '02', label: '1966-1969年' },
                { id: '03', label: '1984-1989年' },
                { id: '04', label: '1994-2001年' }
            ]
        },
        syonai: {
            label: '庄内',
            periods: [
                { id: '00', label: '1913年' },
                { id: '01', label: '1934年' },
                { id: '02', label: '1974年' },
                { id: '03', label: '1987年' },
                { id: '04', label: '1997-2001年' }
            ]
        },
        muroran: {
            label: '室蘭',
            periods: [
                { id: '00', label: '1896年' },
                { id: '01', label: '1917年' },
                { id: '02', label: '1955年' },
                { id: '03', label: '1986-1987年' },
                { id: '04', label: '1998-2000年' }
            ]
        },
        omi: {
            label: '近江',
            periods: [
                { id: '2man', label: '1891-1909年 (2万分の1)' },
                { id: '00',   label: '1920-1922年' },
                { id: '01',   label: '1954年' },
                { id: '02',   label: '1967-1971年' },
                { id: '03',   label: '1979-1986年' },
                { id: '04',   label: '1992-1999年' }
            ]
        },
        iwatekennan: {
            label: '岩手県南',
            periods: [
                { id: '00', label: '1913年' },
                { id: '01', label: '1951年' },
                { id: '02', label: '1968年' },
                { id: '03', label: '1985-1986年' },
                { id: '04', label: '1996-2001年' }
            ]
        },
        nobeoka: {
            label: '延岡',
            periods: [
                { id: '00', label: '1901年' },
                { id: '01', label: '1932-1942年' },
                { id: '02', label: '1965年' },
                { id: '03', label: '1978-1978年' },
                { id: '04', label: '1999-2000年' }
            ]
        },
        yatsushiro: {
            label: '八代',
            periods: [
                { id: '00', label: '1913年' },
                { id: '01', label: '1951年' },
                { id: '02', label: '1968年' },
                { id: '03', label: '1983-1986年' },
                { id: '04', label: '1997-2000年' }
            ]
        },
        omuta: {
            label: '大牟田・島原',
            periods: [
                { id: '00', label: '1910年' },
                { id: '01', label: '1941-1942年' },
                { id: '02', label: '1970年' },
                { id: '03', label: '1983-1987年' },
                { id: '04', label: '1993-1994年' },
                { id: '05', label: '1999-2000年' }
            ]
        },
        shunan: {
            label: '周南',
            periods: [
                { id: '00', label: '1899年' },
                { id: '01', label: '1949年' },
                { id: '02', label: '1968-1969年' },
                { id: '03', label: '1985年' },
                { id: '04', label: '1994-2001年' }
            ]
        },
        yonezawa: {
            label: '米沢',
            periods: [
                { id: '00', label: '1908-1910年' },
                { id: '01', label: '1952-1953年' },
                { id: '02', label: '1970-1973年' },
                { id: '03', label: '1984年' },
                { id: '04', label: '1999-2001年' }
            ]
        },
        ina: {
            label: '伊那',
            periods: [
                { id: '00', label: '1911年' },
                { id: '01', label: '1951-1952年' },
                { id: '02', label: '1976年' },
                { id: '03', label: '1987-1990年' },
                { id: '04', label: '1998-2001年' }
            ]
        },
        iga: {
            label: '伊賀',
            periods: [
                { id: '00', label: '1892年' },
                { id: '01', label: '1937年' },
                { id: '02', label: '1968年' },
                { id: '03', label: '1980-1986年' },
                { id: '04', label: '1996-2001年' }
            ]
        }
    };

    // ----------------------------------------------------
    // オプションを localStorage からロード
    window.plugin.KjmapLayer.loadOption = function() {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                var data = JSON.parse(raw);
                if (data.dataset) OptionData.dataset = data.dataset;
                if (data.period)  OptionData.period = data.period;
                if (typeof data.opacity === 'number') OptionData.opacity = data.opacity;
            } catch(e) {
                console.warn('KjmapLayer: LoadOption JSON parse error', e);
            }
        }
    };

    // オプションを localStorage に保存
    window.plugin.KjmapLayer.saveOption = function() {
        var toSave = {
            dataset: OptionData.dataset,
            period: OptionData.period,
            opacity:  OptionData.opacity
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    };

    // ----------------------------------------------------
    // Leaflet タイルレイヤを（再）生成してマップに追加する
    window.plugin.KjmapLayer.addKjmapLayer = function() {
        if (!OptionData.dataset || !OptionData.period) return;

        var tileUrl = 'https://ktgis.net/kjmapw/kjtilemap/'
                    + OptionData.dataset + '/'
                    + OptionData.period  + '/{z}/{x}/{y}.png';

        if (TileLayerKjmap) {
            // 既存レイヤがあれば URL と不透明度だけ更新して維持
            TileLayerKjmap.setUrl(tileUrl);
            TileLayerKjmap.setOpacity(OptionData.opacity / 10);
            return;
        }

        var tileOpt = {
            attribution: '今昔マップ on the web',
            minZoom: 8,
            maxNativeZoom: (OptionData.dataset === 'kanto' || OptionData.dataset === 'tohoku_pacific_coast') ? 15 : 16,
            maxZoom: 21,
            opacity: OptionData.opacity / 10,
            tms: true
        };

        TileLayerKjmap = L.tileLayer(tileUrl, tileOpt);
        window.addLayerGroup('今昔マップ', TileLayerKjmap, true);
    };

    // ----------------------------------------------------
    // 設定ダイアログを構築・表示する関数
    window.plugin.KjmapLayer.optionDialog = function() {
        // 「地域（dataset）」プルダウン生成
        var $selDataset = $('<select>', { id: 'KjmapDataset' });
        $selDataset.append($('<option>', { value: '' }).text('地域を選択'));
        Object.keys(window.plugin.KjmapLayer.datasets).forEach(function(dsKey) {
            var dsLabel = window.plugin.KjmapLayer.datasets[dsKey].label;
            $selDataset.append($('<option>', { value: dsKey }).text(dsLabel));
        });

        // 「年代（period）」プルダウン生成（初期は空＆disabled）
        var $selPeriod = $('<select>', { id: 'KjmapDatasetPeriod' });
        $selPeriod.append($('<option>', { value: '' }).text('年代を選択'));
        $selPeriod.prop('disabled', true);

        // 不透明度スライダーと表示ラベル
        var $rangeOpacity = $('<input>', {
            type: 'range',
            id: 'KjmapLayer-opacity',
            min: 0,
            max: 10,
            step: 1
        });
        var $spanOpacityDisplay = $('<span>', { id: 'KjmapLayer-opacity-display' });

        // 初期値を反映
        $rangeOpacity.val(OptionData.opacity);
        $spanOpacityDisplay.text((OptionData.opacity * 10) + '%');

        // 地域選択時に「年代プルダウン」を動的に切り替え
        $selDataset.on('change', function() {
            var dsKey = $(this).val();
            $selPeriod.empty().append($('<option>', { value: '' }).text('年代を選択'));
            if (!dsKey) {
                $selPeriod.prop('disabled', true);
                OptionData.dataset = '';
                OptionData.period = '';
                return;
            }
            var periods = window.plugin.KjmapLayer.datasets[dsKey].periods;
            periods.forEach(function(p) {
                $selPeriod.append($('<option>', { value: p.id }).text(p.label));
            });
            $selPeriod.prop('disabled', false);

            // 以前選択していた dataset と同じなら、過去の period をプリセット
            if (OptionData.dataset === dsKey) {
                $selPeriod.val(OptionData.period);
            } else {
                OptionData.period = '';
            }
        });

        // ダイアログ起動時に「過去選択値」を反映
        $selDataset.val(OptionData.dataset);
        if (OptionData.dataset) {
            $selDataset.trigger('change');
            $selPeriod.val(OptionData.period);
        }

        // 年代選択時に即座にマップを切り替え
        $selPeriod.on('change', function() {
            var prd = $(this).val();
            var ds  = $selDataset.val();
            if (ds && prd) {
                OptionData.dataset = ds;
                OptionData.period  = prd;
                window.plugin.KjmapLayer.addKjmapLayer();
            }
        });

        // スライダー操作で表示とレイヤの不透明度を即時反映
        $rangeOpacity.on('input', function() {
            var v = Number($(this).val());
            $spanOpacityDisplay.text((v * 10) + '%');
            OptionData.opacity = v;
            if (TileLayerKjmap) {
                TileLayerKjmap.setOpacity(v / 10);
            }
        });

        // テーブルレイアウトでダイアログ本文を構築
        var $table = $('<table>');
        var $tr1 = $('<tr>');
        $tr1.append($('<td>').text('地域')).append($('<td>').append($selDataset));
        var $tr2 = $('<tr>');
        $tr2.append($('<td>').text('年代')).append($('<td>').append($selPeriod));
        var $tr3 = $('<tr>');
        $tr3.append($('<td>').text('不透明度')).append($('<td>').append($rangeOpacity)).append($('<td>').append($spanOpacityDisplay));
        $table.append($tr1, $tr2, $tr3);

        var html = $('<div>').append($table);

        dialog({
            html: html,
            id: 'KjmapLayer-options-all',
            title: '今昔マップ設定（全データセット対応）',
            width: 'auto',
            focusCallback: function() {
                // ダイアログ再フォーカス時にスライダーを過去値に戻す
                $rangeOpacity.val(OptionData.opacity);
                $spanOpacityDisplay.text((OptionData.opacity * 10) + '%');
            },
            closeCallback: function() {
                var dsKey = $selDataset.val();
                var prd   = $selPeriod.val();
                var opa   = Number($rangeOpacity.val());

                if (!dsKey || !prd) {
                    alert('地域と年代を選択してください');
                    return false;
                }

                OptionData.dataset = dsKey;
                OptionData.period  = prd;
                OptionData.opacity = opa;
                window.plugin.KjmapLayer.saveOption();
                return true;
            }
        });
    };

    // ----------------------------------------------------
    // プラグイン初期化
    var setup = function() {
        // 1. 保存済みオプションを読み込む
        window.plugin.KjmapLayer.loadOption();

        // 2. ツールボックスに「今昔マップ設定」リンクを追加
        $('#toolbox').append(
            '<a onclick="window.plugin.KjmapLayer.optionDialog(); return false;">今昔マップ設定</a>'
        );

        // 3. ロード時に保存済みオプションがあればレイヤを追加
        window.plugin.KjmapLayer.addKjmapLayer();
    };

    setup.info = plugin_info;
    if (!window.bootPlugins) window.bootPlugins = [];
    window.bootPlugins.push(setup);
    if (window.iitcLoaded && typeof setup === 'function') setup();
}

// IITC 本体にプラグインを注入
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
    info.script = {
        version: GM_info.script.version,
        name: GM_info.script.name,
        description: GM_info.script.description
    };
}
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);
