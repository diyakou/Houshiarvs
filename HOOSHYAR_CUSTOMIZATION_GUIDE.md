# راهنمای تبدیل Cline به افزونه اختصاصی هشیار

این سند نقشه اجرایی تبدیل این fork از Cline به افزونه اختصاصی **Hooshyar (هشیار)** است. مشخصات ارتباط با سرور در [`apidocs.md`](./apidocs.md) آمده و مبنای تنظیم provider در این راهنماست.

> وضعیت فعلی مهم: فایل‌های `src/apiConfig.ts`، `src/apiClient.ts` و `src/chatViewProvider.ts` که در `apidocs.md` نام برده شده‌اند، در این مونوریپوی Cline وجود ندارند. Cline فعلی درخواست مدل را از مسیر `sdk/packages/llms` و تنظیمات provider مدیریت می‌کند. بنابراین نباید آن پیاده‌سازی قدیمی را عیناً به ریشه پروژه منتقل کرد؛ قابلیت‌های آن باید در معماری provider فعلی ادغام شوند.

## هدف نهایی

نسخه نهایی باید این ویژگی‌ها را داشته باشد:

- نام، آیکن، متن‌ها و لینک‌های اختصاصی هشیار؛
- نمایش هشیار به‌عنوان provider اصلی و پیش‌فرض؛
- اتصال پیش‌فرض به `https://wqai.morvism.ir/v1`؛
- ذخیره امن API Key در secret storage موجود Cline؛
- دریافت مدل‌ها از `GET /v1/models`؛
- پشتیبانی از streaming، tool call، تصویر و لغو درخواست؛
- نمایش سهمیه از `GET /v1/usage`؛
- حذف یا مخفی‌سازی ورود، خرید، Cline Cloud و providerهای غیرضروری؛
- تولید فایل VSIX مستقل با شناسه و publisher مخصوص هشیار.

## تصمیم معماری قبل از شروع

API هشیار طبق `apidocs.md` دو قالب دارد: `anthropic` و `openai`. برای نسخه اول، **OpenAI-compatible را قالب رسمی افزونه قرار دهید**. Cline در حال حاضر adapter کامل آن را دارد و streaming و tool calling را از طریق AI SDK مدیریت می‌کند.

پیکربندی هدف نسخه اول:

```text
providerId: hooshyar
family: openai-compatible
baseUrl: https://wqai.morvism.ir/v1
defaultModelId: claude-sonnet-5
apiKeyEnv: HOOSHYAR_API_KEY
```

اگر backend هشیار فقط endpoint آنتروپیک را به‌صورت کامل و پایدار ارائه می‌کند، `family` را `anthropic` قرار دهید. قرار دادن انتخاب `apiFormat` داخل یک provider واحد توصیه نمی‌شود، چون factory و wire protocol در Cline بر اساس family انتخاب می‌شوند. اگر هر دو قالب باید در UI در دسترس باشند، دو provider مجزا با شناسه‌های `hooshyar` و `hooshyar-anthropic` بسازید؛ ولی فقط یکی را پیش‌فرض و قابل مشاهده برای کاربر عادی نگه دارید.

## فاز صفر: آماده‌سازی و محدوده وایت‌لیبل

1. یک branch مستقل بسازید، برای مثال `feat/hooshyar-white-label`.
2. تصمیم‌های زیر را قطعی کنید:
   - نام لاتین: `Hooshyar` یا `Houshiar`؛ در این سند `Hooshyar` استفاده شده است.
   - شناسه extension، برای مثال `hooshyar-ai`؛
   - publisher مارکت، دامنه وب، صفحه پشتیبانی و privacy policy؛
   - لوگوی SVG تک‌رنگ برای Activity Bar و PNG رنگی برای Marketplace؛
   - قالب رسمی API و مدل پیش‌فرض واقعی؛
   - اینکه providerهای دیگر کاملاً حذف شوند یا فقط پشت گزینه Advanced مخفی بمانند.
3. وضعیت baseline را قبل از تغییر ثبت کنید:

```bash
bun --version
node --version
bun run build:sdk
bun -F @cline/llms test
```

نسخه مورد انتظار Bun برابر `1.4.2` و Node حداقل `22` است. در این پروژه از npm، yarn یا pnpm استفاده نکنید.

## فاز یک: افزودن provider هشیار به SDK

### ۱. تعریف provider

فایل اصلی:

```text
sdk/packages/llms/src/providers/builtins.ts
```

یک `BuiltinSpec` مشابه providerهای OpenAI-compatible موجود اضافه کنید:

```ts
{
  id: "hooshyar",
  name: "Hooshyar",
  description: "Hooshyar AI coding models",
  family: "openai-compatible",
  popular: 100,
  capabilities: ["tools"],
  defaultModelId: "claude-sonnet-5",
  apiKeyEnv: ["HOOSHYAR_API_KEY"],
  defaults: {
    baseUrl: "https://wqai.morvism.ir/v1",
  },
}
```

نکات:

- `baseUrl` باید تا `/v1` باشد؛ adapter موجود خودش `/chat/completions` را استفاده می‌کند.
- فقط capabilityهایی را اعلام کنید که سرور واقعاً پشتیبانی می‌کند. `reasoning`، `images` یا `prompt-cache` را بدون تست فعال نکنید.
- اگر نام مدل واقعی متفاوت است، مقدار `defaultModelId` را از پاسخ production endpoint بگیرید.
- کلید را هرگز به `defaults` یا source code اضافه نکنید.

در معماری فعلی معمولاً نیازی به ساخت `apiClient.ts` جداگانه نیست. adapter عمومی در فایل زیر base URL، header، streaming و tool calls را انجام می‌دهد:

```text
sdk/packages/llms/src/providers/vendors/openai-compatible.ts
```

### ۲. ثبت مدل‌ها

سه راه وجود دارد؛ به این ترتیب اولویت دهید:

1. دریافت زنده از `GET /v1/models`؛
2. catalog محلی کوچک به‌عنوان fallback؛
3. ورود دستی model ID در تنظیمات پیشرفته.

برای catalog fallback حداقل این metadataها را برای هر مدل مشخص کنید:

| فیلد | مقدار لازم |
|---|---|
| `id` | دقیقاً همان مقدار قابل قبول backend |
| `name` | نام نمایشی |
| `contextWindow` | ظرفیت واقعی context |
| `maxTokens` | سقف خروجی واقعی |
| `supportsImages` | فقط پس از تست payload تصویری |
| `supportsPromptCache` | فقط اگر usage/cache metadata معتبر برمی‌گردد |

تولید یا ویرایش فایل‌های `*.generated.ts` را دستی انجام ندهید، مگر اینکه اسکریپت generator پروژه همان فایل را منبع اصلی بداند. ابتدا مسیر generation را از scripts پکیج `@cline/llms` بررسی و خروجی را با دستور رسمی بازسازی کنید.

### ۳. headerهای اختصاصی

adapter عمومی از `apiKey`، `baseUrl` و `headers` پشتیبانی می‌کند. برای قالب OpenAI، header استاندارد باید این باشد:

```http
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

اگر backend به `User-Agent: claude-code/hooshyar` یا header ثابت دیگری نیاز دارد، آن را در تنظیمات provider یا یک fetch wrapper محدود به provider `hooshyar` اضافه کنید. API Key را هم‌زمان داخل header سفارشی و config عادی تکثیر نکنید.

در صورت انتخاب قالب Anthropic، provider باید از family آنتروپیک استفاده کند تا `x-api-key`، `anthropic-version`، eventهای Anthropic SSE و prompt caching به شکل درست مدیریت شوند.

### ۴. retry و timeout

قبل از افزودن retry سفارشی، رفتار retry لایه AI SDK و Cline را بررسی کنید. retry تودرتو می‌تواند یک درخواست را چند برابر کند. سیاست مورد نیاز هشیار:

- retry برای خطاهای شبکه، `429` و `500/502/503/504`؛
- بدون retry برای `401` و `403`؛
- رعایت `Retry-After` با سقف ۶۰ ثانیه؛
- پشتیبانی کامل از `AbortSignal`؛
- timeout پیش‌فرض ۱۲۰ ثانیه؛
- لاگ بدون API Key و بدون محتوای حساس.

قاعده نوشته‌شده در `apidocs.md` که «حداقل ۶ تلاش حتی با مقدار کمتر» انجام می‌دهد مناسب نیست. در پیاده‌سازی جدید تعداد کل تلاش‌ها باید دقیقاً `maxRetries + 1` باشد.

### ۵. تست provider

حداقل تست‌های زیر را کنار تست‌های `sdk/packages/llms/src/providers` اضافه کنید:

- ساخت URL صحیح `/v1/chat/completions`؛
- ارسال Bearer token بدون چاپ secret؛
- parsing متن streaming؛
- tool call چندبخشی و JSON fragment؛
- usage و finish reason؛
- پاسخ JSON غیرstream در صورت پشتیبانی backend؛
- خطاهای `401`، `403`، `404`، `429` و `5xx`؛
- cancel و timeout؛
- پیام فارسی UTF-8؛
- ورودی تصویر، فقط اگر capability فعال است.

فرمان‌ها:

```bash
bun -F @cline/llms test
bun run build:sdk
```

بعد از هر تغییر در SDK، قبل از اجرای extension حتماً `bun run build:sdk` را اجرا و process قبلی را restart کنید؛ پکیج‌های SDK از `dist/` resolve می‌شوند و hot reload سورس SDK ندارند.

## فاز دو: تنظیمات، کلید و onboarding

### ۱. provider پیش‌فرض

UI فعلی providerها را از manifestهای SDK می‌سازد. پس از ثبت `hooshyar`، آن را در onboarding و settings به‌عنوان انتخاب اول قرار دهید و مقادیر اولیه را چنین تنظیم کنید:

```json
{
  "provider": "hooshyar",
  "modelId": "claude-sonnet-5",
  "baseUrl": "https://wqai.morvism.ir/v1"
}
```

فایل‌ها و مسیرهای مهم برای بررسی:

```text
apps/vscode/webview-ui/src/components/onboarding/
apps/vscode/webview-ui/src/components/settings/
apps/vscode/webview-ui/src/components/settings/sections/ApiConfigurationSection.tsx
apps/vscode/src/core/controller/models/
sdk/packages/core/src/types/provider-settings.ts
```

### ۲. ذخیره API Key

از secret handling و provider settings موجود Cline استفاده کنید. کلید نباید در `settings.json`، local storage، telemetry، console log یا state قابل export ذخیره شود.

UX پیشنهادی:

1. صفحه خوش‌آمد هشیار فقط فیلد API Key و دکمه «اتصال» را نشان دهد.
2. پس از ذخیره، یک درخواست سبک به `/v1/models` اجرا شود.
3. در خطای `401` پیام «کلید API نامعتبر یا منقضی است» نمایش داده شود.
4. مقدار کلید بعد از ذخیره هیچ‌وقت دوباره به webview ارسال نشود؛ فقط وضعیت «تنظیم شده» منتقل شود.

### ۳. محدود کردن providerها

برای نسخه اختصاصی دو انتخاب دارید:

- **Soft lock (پیشنهادی):** هشیار provider پیش‌فرض است و providerهای دیگر فقط در Advanced دیده می‌شوند. نگهداری fork آسان‌تر است.
- **Hard lock:** فقط provider هشیار قابل انتخاب است. تجربه کاملاً اختصاصی می‌شود، اما بخش‌هایی مانند migration، CLI، تست‌ها و انتخاب مدل باید با دقت اصلاح شوند.

در Hard lock صرفاً componentهای UI را پنهان نکنید؛ ورودی persisted config، CLI config و migration قدیمی را نیز validate کنید تا provider دیگری از state قبلی فعال نشود.

## فاز سه: مدل‌ها و سهمیه

### ۱. مدل‌ها (`GET /v1/models`)

client دریافت مدل باید این پاسخ‌ها را normalize کند:

```json
{ "data": [{ "id": "claude-sonnet-5" }] }
```

```json
{ "models": [{ "name": "claude-sonnet-5" }] }
```

همچنین آرایه مستقیم را بپذیرد. الزامات:

- همان Bearer token درخواست inference استفاده شود؛
- timeout کوتاه‌تر، مثلاً ۱۰ تا ۲۰ ثانیه؛
- cache محدود با دکمه refresh؛
- حذف IDهای خالی و duplicate؛
- fallback به مدل پیش‌فرض در قطع شبکه؛
- عدم اعتماد به metadata قیمت یا context مگر schema آن قطعی باشد.

### ۲. مصرف (`GET /v1/usage`)

یک service کوچک و مستقل از مسیر inference بسازید و خروجی backend را به view model پایدار تبدیل کنید:

```ts
interface HooshyarUsage {
  plan?: string
  usedToday?: number
  remainingToday?: number
  billing?: unknown
  limits?: unknown
  raw?: unknown
}
```

این اطلاعات را در Settings یا Account با حالت‌های loading، unavailable و unauthorized نمایش دهید. شکست endpoint مصرف نباید chat را از کار بیندازد.

## فاز چهار: حذف وابستگی‌های محصول Cline

این فاز فقط تغییر نام نیست. قابلیت‌های زیر را تعیین تکلیف کنید:

| بخش Cline | اقدام پیشنهادی برای هشیار |
|---|---|
| Cline Account / OAuth | حذف از navigation و onboarding |
| ClinePass و خرید اشتراک | حذف کامل از UI و feature flags |
| Cline Cloud endpoints | غیرفعال یا جایگزین با backend هشیار |
| telemetry | غیرفعال پیش‌فرض یا انتقال با رضایت کاربر و privacy policy |
| marketplace / MCP catalog | حفظ، حذف یا جایگزینی آگاهانه |
| docs و support links | جایگزینی با دامنه هشیار |
| update / release links | انتقال به کانال انتشار هشیار |

مسیرهای مهم:

```text
apps/vscode/src/config.ts
apps/vscode/src/common.ts
apps/vscode/webview-ui/src/components/account/
apps/vscode/webview-ui/src/components/onboarding/
apps/vscode/webview-ui/src/hooks/useClinePassPromo.ts
```

هر endpoint با دامنه `cline.bot` را فهرست کنید و برای هر مورد یکی از سه وضعیت «حفظ»، «جایگزینی» یا «حذف» ثبت کنید. جایگزینی کورکورانه رشته `Cline` در کل repository انجام ندهید؛ نام‌های داخلی، migration keyها، command IDها و public APIها ممکن است برای سازگاری لازم باشند.

## فاز پنج: برندسازی افزونه

### ۱. manifest افزونه

فایل:

```text
apps/vscode/package.json
```

موارد زیر را تغییر دهید:

- `name` به شناسه جدید و یکتا؛
- `displayName` به `Hooshyar`؛
- `description`؛
- `publisher` و `author`؛
- `repository`، `homepage` و `bugs`؛
- `keywords`؛
- عنوان activity bar، walkthrough و commandها؛
- category تنظیمات.

تغییر `name` باعث تغییر extension ID و محل storage می‌شود. قبل از آن درباره migration داده‌های نسخه قبلی تصمیم بگیرید. command IDهای داخلی مانند `cline.*` را می‌توان در نسخه اول برای سازگاری نگه داشت و فقط عنوان نمایشی را تغییر داد؛ تغییر هم‌زمان همه IDها ریسک بالایی دارد.

### ۲. آیکن‌ها و لوگوها

دارایی‌های فعلی:

```text
apps/vscode/assets/icons/icon.svg
apps/vscode/assets/icons/icon.png
apps/vscode/assets/icons/cline-bot.svg
apps/vscode/assets/icons/cline-bot.ttf
apps/vscode/assets/icons/cline-bot.woff
apps/vscode/webview-ui/src/assets/ClineLogoVariable.tsx
apps/vscode/webview-ui/src/assets/ClineLogoWhite.tsx
```

- برای Activity Bar از SVG تک‌رنگ و سازگار با theme استفاده کنید.
- برای Marketplace از PNG با رزولوشن مناسب استفاده کنید.
- اگر glyph font را عوض می‌کنید، codepoint و تعریف `contributes.icons` را با هم تست کنید.
- لوگوهای React را به componentهای `HooshyarLogo...` تبدیل و importها را اصلاح کنید.

### ۳. متن‌ها و لینک‌ها

جست‌وجوی audit:

```bash
rg -n "Cline|cline\.bot|saoudrizwan|claude-dev" apps/vscode
```

هر نتیجه را دسته‌بندی کنید:

- متن قابل مشاهده: ترجمه/تغییر برند؛
- identifier داخلی: فعلاً حفظ مگر migration نوشته شود؛
- تست و fixture: بعد از تغییر رفتار به‌روزرسانی؛
- copyright/license: حذف نشود؛
- لینک خدمات Cline: حذف یا جایگزینی.

برای فارسی‌سازی کامل، RTL را در پیام‌ها و Markdown تست کنید؛ ولی کد، diff، terminal و نام فایل باید LTR باقی بمانند. بهتر است جهت متن بر اساس محتوای هر بلوک تعیین شود، نه اینکه کل webview به‌صورت اجباری RTL شود.

## فاز شش: امنیت، حریم خصوصی و مجوز

- پروژه تحت Apache-2.0 است؛ فایل `LICENSE` و noticeهای لازم را حفظ کنید.
- برند و لوگوی Cline را به‌عنوان برند محصول جدید استفاده نکنید.
- privacy policy باید مشخص کند prompt، فایل، telemetry و اطلاعات مصرف به کجا ارسال می‌شوند.
- API Key در log، crash report، analytics event و export تنظیمات redaction شود.
- `extraHeaders` در نسخه عمومی یا حذف شود یا فقط allowlist محدودی داشته باشد؛ چون secret داخل تنظیمات عادی امن نیست.
- فقط HTTPS production پذیرفته شود؛ HTTP صرفاً برای localhost در dev.
- متن خطای backend قبل از نمایش/ثبت، از secret و اطلاعات داخلی پاک‌سازی شود.
- telemetry هشیار باید opt-in یا حداقل شفاف و قابل غیرفعال‌سازی باشد.

## فاز هفت: تست نهایی

### ماتریس پذیرش API

| سناریو | نتیجه مورد انتظار |
|---|---|
| API Key معتبر | مدل‌ها بارگذاری و chat شروع شود |
| کلید خالی | UI درخواست کلید کند و secret لو نرود |
| `401/403` | بدون retry، پیام فارسی قابل فهم |
| `429` | رعایت `Retry-After` و امکان cancel |
| `5xx` | retry محدود با backoff و jitter |
| SSE متن | نمایش تدریجی بدون تکرار chunk |
| tool call | JSON کامل، اجرا و ارسال tool result |
| stream ناقص | خطای کنترل‌شده یا retry بدون اجرای دوباره ابزار |
| فارسی | UTF-8 و جهت متن صحیح |
| مدل‌ها unavailable | fallback و امکان refresh |
| usage unavailable | chat سالم بماند |

### فرمان‌های بررسی

```bash
bun run build:sdk
bun -F @cline/llms test
cd apps/vscode
bun run check-types
bun run lint
bun run test:unit
bun run build:webview
bun esbuild.mjs
```

برای تست واقعی extension، VS Code Extension Development Host را اجرا کنید و این موارد را دستی بررسی کنید:

- نصب تمیز بدون state قبلی؛
- ارتقا از نسخه قبلی هشیار؛
- ذخیره و حذف کلید؛
- restart شدن VS Code؛
- تغییر workspace؛
- شروع، cancel و resume یک task؛
- tool approval و diff؛
- حالت روشن و تاریک؛
- متن فارسی و انگلیسی؛
- عدم وجود لینک یا متن ناخواسته Cline در صفحات کاربر.

## فاز هشت: بسته‌بندی و انتشار

1. version، publisher و extension ID را نهایی کنید.
2. README مارکت، screenshots، privacy policy و support URL را آماده کنید.
3. build production بگیرید:

```bash
cd apps/vscode
bun run package
```

4. VSIX را در یک محیط VS Code تمیز نصب و smoke test کنید.
5. secret، source map ناخواسته، endpoint staging و assetهای قدیمی را داخل بسته بررسی کنید.
6. نسخه را ابتدا در کانال داخلی/بتا منتشر کنید و بعد از مشاهده خطاهای واقعی به stable ببرید.

طبق قواعد این repository فایل `.changeset/` نسازید. release note در زمان انتشار داخل `CHANGELOG.md` مرتبط نوشته می‌شود.

## ترتیب پیشنهادی Pull Requestها

برای قابل review ماندن fork، کار را به این بخش‌ها تقسیم کنید:

1. **Provider:** ثبت `hooshyar`، مدل fallback و تست transport؛
2. **Onboarding:** کلید، مدل و انتخاب پیش‌فرض؛
3. **Usage:** سرویس `/v1/usage` و UI سهمیه؛
4. **Cloud removal:** حذف account/ClinePass/endpointهای ناخواسته؛
5. **Branding:** manifest، لوگو، متن و لینک‌ها؛
6. **Release:** packaging، اسناد، privacy و smoke test.

این تفکیک باعث می‌شود اشکال API از اشکال برندسازی جدا بماند و همگام‌سازی آینده با upstream ساده‌تر شود.

## تعریف Done

پروژه زمانی آماده انتشار است که تمام موارد زیر برقرار باشند:

- provider هشیار بدون انتخاب دستی provider دیگر کار کند؛
- API Key فقط در secret storage باشد؛
- streaming و حداقل یک tool call واقعی end-to-end موفق باشند؛
- مدل و usage از backend واقعی خوانده شوند؛
- هیچ درخواست ناخواسته‌ای به سرویس‌های Cline ارسال نشود؛
- نام، لوگو، لینک و متن قابل مشاهده متعلق به هشیار باشد؛
- تست‌های SDK و VS Code مرتبط سبز باشند؛
- VSIX روی پروفایل تمیز نصب و اجرا شود؛
- Apache-2.0، attribution و privacy policy رعایت شده باشند.

## فایل‌های مرجع اصلی

```text
apidocs.md
sdk/packages/llms/src/providers/builtins.ts
sdk/packages/llms/src/providers/vendors/openai-compatible.ts
sdk/packages/llms/src/providers/vendors/anthropic.ts
sdk/packages/llms/src/providers/registry.ts
sdk/packages/core/src/types/provider-settings.ts
apps/vscode/package.json
apps/vscode/src/config.ts
apps/vscode/src/common.ts
apps/vscode/src/core/controller/models/
apps/vscode/webview-ui/src/components/settings/
apps/vscode/webview-ui/src/components/onboarding/
apps/vscode/assets/icons/
apps/vscode/webview-ui/src/assets/
```

