"""Build activity-guide/index.html from acts_data.py and site_template.html.

Usage (from anywhere): python3 activity-guide/source/build.py

The activity list comes from activities.json at the root of the repository;
categories, suggested ages and descriptions are in acts_data.py; the screenshots
are img/NN-name.jpg (NN = position in activities.json) and admin/*.jpg.
"""
import json, os, re
import acts_data as a

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, '..', 'index.html'))

items = []
for i, x in enumerate(a.acts):
    n = x['name']
    c, age, need, desc = a.D[n]
    m = re.match(r'(\d+)\+', age)
    items.append({
        "n": n, "c": c, "age": age, "min": int(m.group(1)) if m else None, "need": need, "d": desc,
        "img": "img/%02d-%s.jpg" % (i, re.sub(r'[^a-z0-9]+', '-', n.lower()).strip('-')),
    })
items.sort(key=lambda t: (t["c"], t["n"].lower()))

admin = [
    ("login", "Sign in", "Sign in with an admin account. The first admin account is created with the add-admin.sh script, run on the server machine."),
    ("home", "Home", "Totals for students, activities, Journal entries and classrooms, the top contributors and top activities, and the most recent students and entries."),
    ("users", "Users", "Search users and filter them by role or classroom. Add, import or export users, then open, edit or delete one."),
    ("users-add", "User editor", "Name, language, role (student, teacher or admin), buddy color, password and classrooms of one user."),
    ("activities", "Activities", "The activities installed on the server. Star the ones shown on the home screen, reorder them, or launch one."),
    ("classrooms", "Classrooms", "Groups of students with their student counts. Add, edit or delete a classroom."),
    ("classrooms-add", "Classroom editor", "Name, color and students of a classroom."),
    ("journal", "Journals", "Pick a user, or the shared journals, to browse their Journal entries and view, edit or remove them. Empty here: I could not add entries to the test database."),
    ("assignments", "Assignments", "Give students work and follow their deliveries, filtered by status. Empty here for the same reason as the Journals."),
    ("stats", "Statistics", "Charts of active students in the last month, entries per student, which clients connect (web app or app) and how students launch activities. You can add your own charts."),
    ("profile", "Profile", "The admin's own name, language and password, and two-factor authentication."),
]
data = {"cats": a.CATS, "items": items,
        "admin": [{"id": i, "t": t, "d": d, "img": "admin/%s.jpg" % i} for i, t, d in admin]}

template = open(os.path.join(HERE, 'site_template.html')).read()
html = template.replace('__DATA__', json.dumps(data, ensure_ascii=False).replace('</', '<\\/'))
open(OUT, 'w').write(html)
print("wrote", OUT, len(items), "activities")
