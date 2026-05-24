# Google Sign-In: origin_mismatch

لو ظهرت رسالة:

```text
Error 400: origin_mismatch
```

فده معناه إن Google OAuth client مش سامح للعنوان اللي التطبيق شغال منه.

## الحل

افتح Google Cloud Console:

```text
APIs & Services -> Credentials -> OAuth 2.0 Client IDs
```

اختار Web client المستخدم في `.env`:

```env
VITE_GOOGLE_CLIENT_ID=617436995759-t2tp11j582kfupng4s4qcvbivoe0jj1p.apps.googleusercontent.com
LEVELUP_GOOGLE_CLIENT_ID=617436995759-t2tp11j582kfupng4s4qcvbivoe0jj1p.apps.googleusercontent.com
```

في `Authorized JavaScript origins` أضف القيم دي بالضبط:

```text
http://localhost:5173
http://127.0.0.1:5173
```

ولو Vite اشتغل على بورت تاني، أضفه كمان، مثال:

```text
http://localhost:5174
http://127.0.0.1:5174
```

لما تنشر الموقع، أضف دومين الإنتاج كمان:

```text
https://your-domain.com
```

## ملاحظات

- لا تضف slash في الآخر. استخدم `http://localhost:5173` وليس `http://localhost:5173/`.
- لازم يكون OAuth client من نوع `Web application`.
- بعد الحفظ، اعمل hard refresh للمتصفح أو افتح Incognito.
- Google قد يأخذ دقائق قليلة لتطبيق التغيير.
