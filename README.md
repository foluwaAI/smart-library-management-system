# smart-library-management-system
This is my INS205 project - a library management web app. Basically it lets people sign up, look through the book catalog, borrow books, return them, and check what they've borrowed before. There's also an admin side where you can add/remove books and see everyone's borrow activity.

I used Node.js and Express for the backend, SQLite for the database (didn't want to deal with setting up a separate database server for a school project), and just plain HTML/CSS/JS for the frontend since I didn't need anything fancy like React for this.

## Why it's set up this way

Wanted it to actually feel like a real library system instead of just another to-do list clone, so I focused on the parts that matter most - knowing who's logged in (sessions), keeping passwords safe (bcrypt hashing instead of storing them as plain text), and making sure book availability updates properly when someone borrows or returns something.

## What it can do

If you're just browsing (not logged in), you can still look through all the books, search by title/author/category, and see how many copies are left.

Once you're logged in you can actually borrow books (as long as there's a copy available), return the ones you've borrowed, and check your dashboard which shows what you currently have out plus your full history.

If you're an admin, you get extra pages for adding new books, deleting ones that shouldn't be there, and looking at every borrow record + user in the system.

## Stack
- Node.js + Express (backend/API)
- SQLite (database)
- bcrypt for password hashing
- express-session to keep people logged in
- HTML/CSS/vanilla JS on the frontend
- Docker for containerizing everything

## Folder structure

server.js - all the backend logic and routes
database.js - connects and sets up the SQLite database
library.db - the actual database file
public/ - everything the browser sees:
  index.html, login.html, register.html, catalog.html, dashboard.html, admin.html
  style.css
  book cover images (book 1.png - book 4.png) and library.jpeg for the background
Dockerfile
.gitignore
package.json / package-lock.json
README.md

## Running it on your machine

Make sure you have Node installed, then:

git clone https://github.com/foluwaAI/smart-library-management-system.git
cd smart-library-management-system
npm install
node server.js


Then just go to localhost:3000 in your browser and it should be up.

## Running it through Docker instead

If you'd rather just run it in a container:

docker build -t foluwaai/smart-library-management-system .
docker run -p 3000:3000 foluwaai/smart-library-management-system


Same thing, still runs on localhost:3000.

Or if you don't want to build it yourself, you can just pull the image straight from DockerHub:

docker pull foluwaai/smart-library-management-system
docker run -p 3000:3000 foluwaai/smart-library-management-system


## API routes (quick reference)

Auth:
- POST /api/register - sign up
- POST /api/login - log in
- POST /api/logout - log out
- GET /api/me - who's currently logged in

Books:
- GET /api/books - get the whole catalog (public)
- POST /api/books - add a book (admin)
- DELETE /api/books/:id - remove a book (admin)

Borrowing:
- POST /api/borrow - borrow a book
- POST /api/return - return a book
- GET /api/my-borrows - see current borrows
- GET /api/my-borrows/history - see full borrow history

Admin:
- GET /api/admin/borrow-records - every borrow record
- GET /api/users - every registered user

Other:
- GET /api/stats - total books + total members (public)

## A couple things worth mentioning

node_modules isn't in this repo on purpose (it's in .gitignore) - running npm install will regenerate it based on package.json, no need to upload thousands of files for that.

The database is just a local SQLite file (library.db), so there's nothing extra to configure or connect to before running it.
