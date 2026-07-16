require("dotenv").config();
const fs = require("fs");
const pool = require("./db");

async function migrate() {
  const db = JSON.parse(fs.readFileSync("./data/db.json", "utf8"));

  console.log(`Migrating ${db.products.length} products...`);

  for (const p of db.products) {
    await pool.query(
      `
      INSERT INTO products (
        id, name, cat, catlabel, telugu,
        price, oldprice, discount, stock,
        rating, seller, delivery, description,
        image, images, color, initials,
        featured, active
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,
        $10,$11,$12,$13,
        $14,$15,$16,$17,
        $18,$19
      )
      ON CONFLICT (id)
      DO UPDATE SET
        name=EXCLUDED.name,
        cat=EXCLUDED.cat,
        catlabel=EXCLUDED.catlabel,
        telugu=EXCLUDED.telugu,
        price=EXCLUDED.price,
        oldprice=EXCLUDED.oldprice,
        discount=EXCLUDED.discount,
        stock=EXCLUDED.stock,
        rating=EXCLUDED.rating,
        seller=EXCLUDED.seller,
        delivery=EXCLUDED.delivery,
        description=EXCLUDED.description,
        image=EXCLUDED.image,
        images=EXCLUDED.images,
        color=EXCLUDED.color,
        initials=EXCLUDED.initials,
        featured=EXCLUDED.featured,
        active=EXCLUDED.active;
      `,
      [
        p.id,
        p.name,
        p.cat,
        p.catLabel || null,
        p.telugu || null,
        p.price,
        p.oldPrice,
        p.discount,
        p.stock,
        p.rating,
        p.seller,
        p.delivery,
        p.description,
        p.image,
        JSON.stringify(p.images || []),
        p.color,
        p.initials,
        p.featured,
        p.active
      ]
    );
  }

  console.log("✅ Products migrated successfully!");
  await pool.end();
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});

