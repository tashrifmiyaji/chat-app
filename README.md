# chat-app
a web app for chat privately.

You can access the app at the following link:
https://chat-app-1oga.onrender.com

## Frontend configuration

Copy `frontend/.env.example` to `frontend/.env` and set `VITE_DEFAULT_USERNAME`
and `VITE_DEFAULT_PASSWORD` to enable the **Default User** login button. These
Vite variables are included in the public frontend build, so anyone can inspect
the configured credentials. Use this only for a personal deployment and never
for an account or password that protects sensitive data. Remove both variables
to hide the button.

The frontend keeps conversation lists and message histories in memory for the
current login session, and caches user searches for one minute. Socket events
update the cached chat data; deletions clear the related cache.
