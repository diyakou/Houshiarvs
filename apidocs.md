# مستند ارتباط Hooshyar با سرور

این سند نحوه ارتباط افزونه Hooshyar با سرور مدل هوش مصنوعی را بر اساس پیاده‌سازی فعلی پروژه توضیح می‌دهد. کد اصلی این بخش در فایل‌های `src/apiConfig.ts` و `src/apiClient.ts` قرار دارد.

## نمای کلی جریان ارتباط

```text
رابط کاربری افزونه
       │
       │ خواندن تنظیمات و API Key
       ▼
 readApiClientConfig
       │
       │ ساخت URL، هدر و payload
       ▼
    ApiClient
       │
       │ HTTPS + JSON / SSE
       ▼
سرور Anthropic-compatible یا OpenAI-compatible
```

افزونه درخواست‌ها را با `fetch` و متد `POST` ارسال می‌کند. پاسخ ترجیحاً به‌صورت استریم SSE دریافت می‌شود؛ با این حال پاسخ عادی `application/json` نیز پشتیبانی شده است.

## تنظیمات اتصال

تنظیمات در بخش `Hooshyar` از Settings در VS Code یا در `settings.json` قابل تعریف هستند:

```json
{
  "hooshyar.apiFormat": "anthropic",
  "hooshyar.baseUrl": "https://wqai.morvism.ir/v1",
  "hooshyar.model": "claude-sonnet-5",
  "hooshyar.maxTokens": 4096,
  "hooshyar.temperature": 1,
  "hooshyar.maxRetries": 5,
  "hooshyar.requestTimeoutMs": 120000,
  "hooshyar.enablePromptCaching": true,
  "hooshyar.extraHeaders": "{}"
}
```

| تنظیم | مقدار پیش‌فرض | توضیح |
|---|---:|---|
| `hooshyar.apiFormat` | `anthropic` | فرمت API؛ یکی از `anthropic` یا `openai` |
| `hooshyar.baseUrl` | `https://wqai.morvism.ir/v1` | آدرس پایه یا آدرس کامل endpoint |
| `hooshyar.apiKey` | خالی | کلید API؛ بهتر است از پنل تنظیمات Hooshyar ذخیره شود |
| `hooshyar.model` | `claude-sonnet-5` | نام مدل ارسالی در درخواست |
| `hooshyar.maxTokens` | `4096` | حداکثر توکن خروجی |
| `hooshyar.temperature` | `1` | میزان تنوع پاسخ |
| `hooshyar.maxRetries` | `5` | تعداد تلاش مجدد برای خطاهای موقت |
| `hooshyar.requestTimeoutMs` | `120000` | مهلت هر درخواست بر حسب میلی‌ثانیه |
| `hooshyar.extraHeaders` | `{}` | هدرهای سفارشی در قالب JSON string |
| `hooshyar.enablePromptCaching` | `true` | فعال‌سازی cache hint در فرمت Anthropic |

> کلید API که از پنل داخلی افزونه ذخیره شود در VS Code Secret Storage با کلید `hooshyar.apiKey` نگه‌داری می‌شود. مقدار Secret Storage بر `hooshyar.apiKey` در `settings.json` اولویت دارد.

## ساخت endpoint

تابع `normalizeApiUrl` مقدار `baseUrl` را به endpoint نهایی تبدیل می‌کند.

### فرمت Anthropic

- `https://example.com` ← `https://example.com/v1/messages`
- `https://example.com/v1` ← `https://example.com/v1/messages`
- اگر URL به `/messages`، `/message`، `/v1/messages` یا `/v1/message` ختم شود، بدون تغییر استفاده می‌شود.

### فرمت OpenAI

- `https://example.com` ← `https://example.com/v1/chat/completions`
- `https://example.com/v1` ← `https://example.com/v1/chat/completions`
- اگر URL به `/chat/completions` یا `/chat/completion` ختم شود، بدون تغییر استفاده می‌شود.

بنابراین می‌توان در `baseUrl` هم ریشه سرور و هم endpoint کامل را قرار داد.

## احراز هویت و هدرها

هدرهای پایه هر درخواست:

```http
Content-Type: application/json
User-Agent: claude-code/hooshyar
Authorization: Bearer <API_KEY>
```

در حالت `anthropic` این هدرها نیز اضافه می‌شوند:

```http
x-api-key: <API_KEY>
anthropic-version: 2023-06-01
anthropic-beta: prompt-caching-2024-07-31
```

اگر API Key خالی باشد، هدرهای `Authorization` و `x-api-key` ارسال نمی‌شوند.

### هدر سفارشی

برای gatewayها یا reverse proxyها می‌توان هدر سفارشی اضافه کرد:

```json
{
  "hooshyar.extraHeaders": "{\"X-Tenant-ID\":\"team-a\",\"X-Client\":\"hooshyar\"}"
}
```

به دلایل امنیتی هدرهای رزروشده زیر از `extraHeaders` پذیرفته نمی‌شوند:

- `authorization`
- `x-api-key`
- `content-type`
- `user-agent`
- `anthropic-version`
- `anthropic-beta`

## بدنه درخواست

### Anthropic-compatible

نمونه ساده‌شده:

```json
{
  "model": "claude-sonnet-5",
  "system": "You are a coding assistant.",
  "messages": [
    { "role": "user", "content": "این تابع را توضیح بده" }
  ],
  "tools": [],
  "max_tokens": 4096,
  "temperature": 1,
  "stream": true
}
```

در صورت فعال بودن Prompt Caching، برای system prompt بزرگ‌تر از ۱۰۰۰ کاراکتر و آخرین تعریف ابزار، `cache_control: { "type": "ephemeral" }` ارسال می‌شود.

### OpenAI-compatible

در این حالت پیام‌ها و ابزارهای داخلی به ساختار Chat Completions تبدیل می‌شوند:

```json
{
  "model": "your-model",
  "messages": [
    { "role": "system", "content": "You are a coding assistant." },
    { "role": "user", "content": "این تابع را توضیح بده" }
  ],
  "tools": [],
  "max_tokens": 4096,
  "temperature": 1,
  "stream": true
}
```

ابزارها به شکل OpenAI function tools و نتیجه ابزار با نقش `tool` ارسال می‌شود. تصویر نیز به شکل data URL در `image_url` قرار می‌گیرد.

## پاسخ استریم (SSE)

سرور بهتر است پاسخ را با هدر زیر برگرداند:

```http
Content-Type: text/event-stream
```

هر رویداد در خط `data:` قرار می‌گیرد و فریم‌ها با یک خط خالی جدا می‌شوند:

```text
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"سلام"}}

data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}
```

در فرمت Anthropic، رویدادهای مهم عبارت‌اند از:

- `message_start`: دریافت آمار مصرف ورودی
- `content_block_start`: شروع متن یا فراخوانی ابزار
- `content_block_delta`: دریافت تدریجی متن یا JSON ابزار
- `content_block_stop`: پایان فراخوانی ابزار
- `message_delta`: دلیل توقف و آمار مصرف خروجی
- `error`: خطای داخل استریم

در فرمت OpenAI، افزونه `choices[0].delta.content`، `delta.tool_calls`، `finish_reason` و رویداد `[DONE]` را پردازش می‌کند.

اگر پاسخ موفق دارای `Content-Type: application/json` باشد، افزونه آن را به‌عنوان پاسخ غیر استریم پردازش می‌کند.

## endpointهای جانبی

### فهرست مدل‌ها

افزونه برای دریافت مدل‌های قابل استفاده، درخواست زیر را با همان هدرهای احراز هویت ارسال می‌کند:

```http
GET /v1/models
```

پاسخ می‌تواند آرایه مستقیم یا یکی از ساختارهای زیر باشد:

```json
{ "data": [{ "id": "model-a" }] }
```

```json
{ "models": [{ "name": "model-a" }] }
```

### وضعیت مصرف

برای نمایش وضعیت سهمیه از endpoint زیر استفاده می‌شود:

```http
GET /v1/usage
```

آدرس‌هایی که از قبل به `/v1/usage`، `/v1/messages/usage` یا `/v1/token/usage` ختم شوند، همان‌طور استفاده می‌شوند. پاسخ مورد انتظار JSON است و می‌تواند اطلاعاتی مانند `plan`، `used_today`، `remaining_today`، `context`، `billing` و `limits` داشته باشد.

## سیاست retry و timeout

- خطاهای شبکه و timeout تا سقف `maxRetries` دوباره تلاش می‌شوند.
- وضعیت‌های HTTP `500`، `502`، `503` و `504` قابل retry هستند.
- وضعیت `429` قابل retry است و در صورت وجود، هدر `Retry-After` رعایت می‌شود.
- تأخیر retry به‌صورت افزایشی، همراه با jitter، از حدود ۱ ثانیه شروع می‌شود.
- مقدار `Retry-After` حداکثر تا ۶۰ ثانیه اعمال می‌شود.
- خطاهای `401` و `403` retry نمی‌شوند.
- استریم خالی، قطع‌شده یا دارای رویداد `error` نیز در صورت باقی بودن تلاش‌ها دوباره درخواست می‌شود.
- لغو عملیات توسط کاربر از طریق `AbortSignal` به درخواست و خواندن stream منتقل می‌شود.

تعداد کل تلاش‌ها برابر `maxRetries + 1` است. در پیاده‌سازی فعلی حداقل ۶ تلاش انجام می‌شود، حتی اگر `maxRetries` کمتر از ۵ تنظیم شده باشد.

## خطاهای رایج

| وضعیت یا پیام | علت محتمل | راه‌حل |
|---|---|---|
| `401` | API Key خالی، اشتباه یا منقضی | کلید را دوباره در Hooshyar Settings ذخیره کنید |
| `403` | حساب به مدل یا منبع دسترسی ندارد | نام مدل و سطح دسترسی حساب را بررسی کنید |
| `404` | `baseUrl` یا `apiFormat` نادرست | endpoint نهایی را با قواعد بالا بررسی کنید |
| `429` | محدودیت نرخ یا سهمیه | `Retry-After`، سهمیه و محدودیت RPM را بررسی کنید |
| `No SSE events received` | پاسخ stream قالب SSE معتبر ندارد | `Content-Type`، خطوط `data:` و جداکننده فریم‌ها را بررسی کنید |
| `Request timed out` | پاسخ سرور بیش از timeout طول کشیده | `requestTimeoutMs` را افزایش دهید یا وضعیت سرور را بررسی کنید |
| خطای parsing ابزار | fragmentهای JSON ابزار ناقص یا ناسازگارند | ساختار tool call پروتکل انتخاب‌شده را بررسی کنید |

برای مشاهده جزئیات، گزینه `hooshyar.debugLogging` را فعال و کانال Output مربوط به Hooshyar را بررسی کنید. توجه کنید که لاگ کامل شبکه ممکن است حاوی داده‌های حساس مکالمه باشد.

## تست دستی اتصال

### تست سرور Anthropic-compatible

```bash
curl -N "https://example.com/v1/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "x-api-key: ${API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"your-model","messages":[{"role":"user","content":"سلام"}],"max_tokens":64,"stream":true}'
```

### تست سرور OpenAI-compatible

```bash
curl -N "https://example.com/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{"model":"your-model","messages":[{"role":"user","content":"سلام"}],"max_tokens":64,"stream":true}'
```

### چک‌لیست سازگاری سرور

- HTTPS معتبر در محیط production
- پشتیبانی از `POST` روی endpoint متناسب با `apiFormat`
- پذیرش هدر `Authorization: Bearer` و، برای Anthropic، `x-api-key`
- پشتیبانی از JSON UTF-8
- پشتیبانی صحیح از SSE یا پاسخ JSON غیر استریم
- ارسال status code مناسب برای خطاها
- ارسال `Retry-After` هنگام پاسخ `429`
- جلوگیری از buffering پاسخ SSE در reverse proxy
- تنظیم timeout پراکسی بیشتر از `hooshyar.requestTimeoutMs`

## نکات امنیتی

- API Key را در repository، فایل نمونه، لاگ یا اسکرین‌شات قرار ندهید.
- برای ذخیره کلید از پنل داخلی افزونه و VS Code Secret Storage استفاده کنید.
- فقط از HTTPS استفاده کنید، مگر در توسعه محلی کنترل‌شده.
- هدرهای سفارشی حاوی secret را با احتیاط تنظیم کنید؛ `extraHeaders` در تنظیمات عادی VS Code ذخیره می‌شود.
- در production، متن خطای سرور نباید اطلاعات داخلی، stack trace یا secret را برگرداند.
- در زمان عیب‌یابی، پس از پایان کار `debugLogging` را غیرفعال کنید.

## فایل‌های مرتبط در پروژه

- `src/apiConfig.ts`: خواندن تنظیمات، ساخت هدرها و نرمال‌سازی URLها
- `src/apiClient.ts`: ارسال درخواست، پردازش SSE/JSON، retry و تبدیل فرمت‌ها
- `src/chatViewProvider.ts`: ذخیره API Key، تنظیمات UI و راه‌اندازی درخواست‌ها
- `src/types.ts`: نوع پیام‌ها، content blockها و تنظیمات
- `package.json`: تعریف تنظیمات قابل مشاهده در VS Code

