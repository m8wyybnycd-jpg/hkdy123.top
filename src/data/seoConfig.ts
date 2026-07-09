/**
 * Centralized SEO configuration for each page.
 * Used by the SEO component to set dynamic title, description,
 * canonical URL, Open Graph tags, and JSON-LD structured data.
 */

export interface PageSEO {
  title: string;
  description: string;
  keywords: string;
  path: string;
  ogType?: string;
}

const SITE_URL = "https://www.hkdy123.top";
const SITE_NAME = "云玩汇";

export const seoConfig: Record<string, PageSEO> = {
  home: {
    title: "云游戏平台哪个好？2026年免费云游戏平台大全 - 云玩汇",
    description:
      "云玩汇聚合全网10+云游戏平台入口、5+云电脑入口和26款免费游戏资源，一页看全、一键直达。不用买显卡，手机也能玩3A。找云游戏，先来这里。",
    keywords: "云游戏平台,免费云游戏,云游戏白嫖,云电脑,云玩汇",
    path: "/",
    ogType: "website",
  },
  "cloud-games": {
    title: "云游戏平台入口大全 - 腾讯START/网易云游戏等10+平台 - 云玩汇",
    description:
      "10+主流云游戏平台入口聚合，腾讯START、网易云游戏、格来云游戏等一页对比查看，一键直达。免费时长、支持游戏、延迟表现全知道。",
    keywords: "云游戏平台,免费云游戏,腾讯START,网易云游戏,格来云游戏,云玩汇",
    path: "/cloud-games",
    ogType: "website",
  },
  "cloud-desktops": {
    title: "免费云电脑入口大全 - 阿里云电脑/华为云电脑等5+平台 - 云玩汇",
    description:
      "5+办公云电脑入口聚合，阿里云电脑、华为云电脑等一页对比。iPad秒变Windows，新用户免费体验，移动办公最佳方案。",
    keywords: "云电脑,免费云电脑,云电脑手机版,iPad变Windows,阿里云电脑,华为云电脑,云玩汇",
    path: "/cloud-desktops",
    ogType: "website",
  },
  "free-games": {
    title: "26款免费云游戏下载 - 夸克网盘免费游戏合集 - 云玩汇",
    description:
      "26款夸克网盘免费游戏资源，含3A大作、独立游戏、经典老游戏。云游戏白嫖必备，一键保存到网盘即下即玩。",
    keywords: "免费游戏,云游戏白嫖,夸克网盘免费游戏,免费云游戏下载,云玩汇",
    path: "/free-games",
    ogType: "website",
  },
  deals: {
    title: "云游戏薅羊毛 - 免费时长/限时优惠聚合 - 云玩汇",
    description:
      "全网云游戏免费时长、限时优惠第一时间聚合。云游戏免排队、云游戏免费时长领取攻略，帮你省钱省时薅羊毛。",
    keywords: "云游戏薅羊毛,云游戏免费时长,云游戏免排队,限时优惠,云玩汇",
    path: "/deals",
    ogType: "website",
  },
  "sms-platforms": {
    title: "24个接码平台导航 - 隐私保护/批量注册 - 云玩汇",
    description:
      "24个接码平台导航，国内外短信验证码接收平台一页看全。保护隐私、批量注册必备工具，含免费和付费平台对比。",
    keywords: "接码平台,接码平台哪个好,隐私保护,批量注册,短信验证码,云玩汇",
    path: "/sms-platforms",
    ogType: "website",
  },
  library: {
    title: "云游戏攻略库 - 新手入门/平台对比/常见问题 - 云玩汇",
    description:
      "云游戏新手入门全攻略、平台对比评测、常见问题解答。云游戏怎么玩、云游戏和云电脑区别、云游戏卡顿怎么办等问题一站搞定。",
    keywords: "云游戏攻略,云游戏怎么玩,云游戏新手教程,云游戏和云电脑区别,云玩汇",
    path: "/library",
    ogType: "website",
  },
};

/** Organization JSON-LD structured data */
export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  description: "云游戏发现站，汇聚全网云游戏平台、云电脑入口和免费游戏资源",
  slogan: "一处发现，云上畅玩",
};

/** WebSite JSON-LD structured data */
export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/search?q={query}`,
    "query-input": "required name=query",
  },
};

/** Generate BreadcrumbList JSON-LD for a page */
export function breadcrumbJsonLd(path: string, pageName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "首页",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: pageName,
        item: `${SITE_URL}${path}`,
      },
    ],
  };
}

export { SITE_URL, SITE_NAME };
