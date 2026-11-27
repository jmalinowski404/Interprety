# Sklep – backend

REST API sklepu internetowego: produkty, kategorie, zamówienia, opinie, logowanie JWT.

Stos: Node.js, Express 5, MongoDB (Mongoose), Zod, Vitest.

## Uruchomienie

Wymagania: Node.js 20+, MongoDB.

```bash
cd backend
npm install
```

Plik `backend/.env`:

```
MONGO_URI=mongodb://localhost:27017/sklep
PORT=4000
JWT_SECRET=<losowy ciąg, np. wynik: openssl rand -hex 32>
AI_API_KEY=<klucz API Groq>
```

Wypełnienie bazy danymi przykładowymi i start serwera:

```bash
npm run seed
npm start
```

API jest dostępne pod `http://localhost:4000/api`.

## Skrypty

| Polecenie | Opis |
|---|---|
| `npm start` | uruchamia serwer |
| `npm run seed` | dodaje dane przykładowe |
| `npm run seed -- --reset` | czyści bazę i dodaje dane przykładowe od nowa |
| `npm test` | uruchamia testy |

## Inicjalizacja bazy danych

Przy każdym starcie serwer tworzy kolekcje i indeksy oraz dodaje brakujące dane słownikowe:

- role: `KLIENT`, `PRACOWNIK`
- stany zamówień: `NIEZATWIERDZONE`, `ZATWIERDZONE`, `ZREALIZOWANE`, `ANULOWANE`

`npm run seed` dodaje dodatkowo:

- 4 kategorie: Telefony, Laptopy, Akcesoria, Audio
- 10 produktów
- 5 zamówień w różnych stanach
- użytkowników:

| Login | Hasło | Rola |
|---|---|---|
| admin | admin | PRACOWNIK |
| klient | klient | KLIENT |
| anna | anna | KLIENT |

Ponowne uruchomienie seeda nie tworzy duplikatów. Zamówienia są dodawane tylko wtedy, gdy kolekcja zamówień jest pusta.

## Uwierzytelnianie

`POST /api/login` z body `{ "login": "...", "password": "..." }` zwraca token ważny 1 godzinę:

```json
{
  "accessToken": "eyJhbGciOi...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": { "id": "...", "login": "admin", "role": "PRACOWNIK" }
}
```

Token przesyła się w nagłówku:

```
Authorization: Bearer <token>
```

Brak tokenu, token niepoprawny lub wygasły – `401`. Brak uprawnień dla danej roli – `403`.

Hasła są przechowywane jako hash bcrypt.

## Endpointy

| Metoda | Ścieżka | Dostęp | Opis |
|---|---|---|---|
| GET | `/api/health` | publiczny | status serwera |
| POST | `/api/login` | publiczny | logowanie |
| GET | `/api/categories` | publiczny | lista kategorii |
| GET | `/api/order-statuses` | publiczny | lista stanów zamówień |
| GET | `/api/products` | publiczny | lista produktów |
| GET | `/api/products/:id` | publiczny | produkt |
| POST | `/api/products` | PRACOWNIK | dodanie produktu |
| PATCH | `/api/products/:id` | PRACOWNIK | zmiana produktu |
| GET | `/api/products/:id/seo-description` | PRACOWNIK | propozycja opisu SEO (HTML) |
| POST | `/api/init` | PRACOWNIK | import produktów z JSON lub CSV |
| GET | `/api/orders` | KLIENT, PRACOWNIK | lista zamówień |
| GET | `/api/orders/:id` | KLIENT, PRACOWNIK | zamówienie |
| POST | `/api/orders` | KLIENT | złożenie zamówienia |
| PATCH | `/api/orders/:id/status` | PRACOWNIK | zmiana stanu zamówienia |
| POST | `/api/orders/:id/opinions` | KLIENT | dodanie opinii |
| GET | `/api/orders/:id/opinions` | KLIENT, PRACOWNIK | pobranie opinii |

KLIENT widzi tylko własne zamówienia i opinie do nich. PRACOWNIK widzi wszystkie.

### Produkty

```json
{
  "name": "Klawiatura mechaniczna",
  "description": "Przełączniki brown, układ ISO.",
  "price": 349.99,
  "weight": 1.2,
  "category": "<id kategorii>"
}
```

- `name` – min. 2 znaki, unikalna
- `description` – min. 8 znaków
- `price`, `weight` – liczby większe od 0
- `category` – ID istniejącej kategorii

`PATCH` przyjmuje dowolny podzbiór tych pól.

### Zamówienia

```json
{
  "username": "Jan Kowalski",
  "email": "jan@example.com",
  "phoneNumber": "+48 501 234 567",
  "items": [
    { "product": "<id produktu>", "quantity": 2 },
    { "product": "<id produktu>", "quantity": 1 }
  ]
}
```

Cena każdej pozycji (`unitPrice`) jest zapisywana w momencie złożenia zamówienia. Późniejsza zmiana ceny produktu nie zmienia istniejących zamówień.

Filtrowanie listy: `GET /api/orders?status=ZATWIERDZONE`, `GET /api/orders?username=...`.

Zmiana stanu: `PATCH /api/orders/:id/status` z body `{ "status": "ZATWIERDZONE" }`.

Dozwolone przejścia:

| Z | Na |
|---|---|
| NIEZATWIERDZONE | ZATWIERDZONE, ANULOWANE |
| ZATWIERDZONE | ZREALIZOWANE, ANULOWANE |
| ZREALIZOWANE | – |
| ANULOWANE | – |

Inne przejście kończy się kodem `409`.

### Opinie

```json
{ "rating": 5, "content": "Szybka wysyłka." }
```

- `rating` – liczba całkowita 1–5
- `content` – niepusty tekst, max. 2000 znaków
- data utworzenia jest ustawiana przez serwer

Opinię może dodać tylko klient, który złożył zamówienie, i tylko gdy zamówienie jest `ZREALIZOWANE` lub `ANULOWANE`. Jedno zamówienie może mieć jedną opinię – kolejna próba zwraca `409`.

### Import produktów

`POST /api/init` działa tylko przy pustej kolekcji produktów, w przeciwnym razie zwraca `409`.

JSON (`Content-Type: application/json`) – tablica produktów lub `{ "products": [...] }`.

CSV (`Content-Type: text/csv`):

```
name,description,price,weight,category
iPhone 18,"Telefon, aparat 48 Mpx",3499.99,0.2,Telefony
MacBook Pro,Laptop do pracy i nauki.,8999,1.6,Laptopy
```

`category` może być nazwą lub ID istniejącej kategorii. Jeżeli którykolwiek produkt jest niepoprawny, ma nieistniejącą kategorię albo nazwa powtarza się w pliku (bez względu na wielkość liter), nic nie jest zapisywane i zwracany jest `422` z listą błędów. Po poprawnym imporcie:

```json
{ "message": "Pomyślnie zainicjalizowano produkty.", "inserted": 3 }
```

### Opis SEO

`GET /api/products/:id/seo-description` wysyła dane produktu do modelu językowego (Groq) i zwraca propozycję opisu w HTML. Opis nie jest zapisywany w bazie. Klucz API jest odczytywany z `AI_API_KEY`.

## Błędy

Błędy są zwracane w formacie `application/problem+json`:

```json
{
  "type": "/problems/validation-error",
  "title": "Błędne dane wejściowe.",
  "status": 422,
  "detail": "Błędne dane produktu podczas tworzenia.",
  "instance": "/api/products",
  "errors": [
    { "field": "price", "message": "Cena produktu musi być większa od 0." }
  ]
}
```

| Kod | Kiedy |
|---|---|
| 400 | niepoprawny JSON, zły format ID, uszkodzony plik CSV |
| 401 | brak lub niepoprawny token, złe dane logowania |
| 403 | brak uprawnień, dostęp do cudzego zamówienia |
| 404 | zasób nie istnieje |
| 409 | niedozwolona zmiana stanu, druga opinia, import przy niepustej bazie |
| 415 | nieobsługiwany format w `/api/init` |
| 422 | niepoprawne dane wejściowe |
| 502 | błąd lub niepoprawna odpowiedź modelu językowego |

## Testy

```bash
npm test
```

Testy wysyłają żądania HTTP do aplikacji (supertest) i korzystają z bazy MongoDB uruchamianej w pamięci (mongodb-memory-server). Nie wymagają działającej bazy ani pliku `.env`. Każdy test zaczyna od pustej bazy.

| Plik | Zakres |
|---|---|
| `tests/product.test.ts` | dodawanie produktów, walidacja |
| `tests/order.test.ts` | zamówienia, zmiany stanów, niezależność ceny w zamówieniu od ceny produktu |
| `tests/auth.test.ts` | logowanie, 401, 403, dostęp do cudzych zamówień |
| `tests/init.test.ts` | import JSON i CSV |
| `tests/opinion.test.ts` | opinie |

## Insomnia

Plik `backend/insomnia.json` zawiera gotową kolekcję żądań (Import → From File). Po zalogowaniu należy wkleić `accessToken` do zmiennych `token_pracownik` i `token_klient` w środowisku, a ID kategorii, produktów i zamówienia do odpowiednich zmiennych. Foldery są ułożone w kolejności wykonywania.

## Struktura

```
backend/
  app.ts            konfiguracja Express, trasy, obsługa błędów
  server.ts         połączenie z bazą, inicjalizacja, start serwera
  controllers/      obsługa żądań
  routes/           definicje tras
  models/           schematy Mongoose
  types/            walidacja Zod
  services/         import produktów, inicjalizacja bazy, kategorie
  middleware/       uwierzytelnianie i autoryzacja
  utils/            ApiError, JWT, prompt dla modelu
  scripts/seed.ts   dane przykładowe
  tests/            testy
```
