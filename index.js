const express = require("express");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_POOLER,
    },
  },
});
app.use(express.json());

app.post("/identify", async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: "Email or phoneNumber required" });
  }

  const existingContacts = await prisma.contact.findMany({
    where: {
      OR: [
        email ? { email } : undefined,
        phoneNumber ? { phoneNumber } : undefined
      ].filter(Boolean)
    },
    orderBy: { createdAt: "asc" }
  });

  // CASE 1: No contacts → create primary
  if (existingContacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "primary"
      }
    });

    return res.json({
      contact: {
        primaryContactId: newContact.id,
        emails: email ? [email] : [],
        phoneNumbers: phoneNumber ? [phoneNumber] : [],
        secondaryContactIds: []
      }
    });
  }

  // Find oldest primary
  let primary = existingContacts.find(c => c.linkPrecedence === "primary");

  // Convert other primaries to secondary
  for (const contact of existingContacts) {
    if (contact.id !== primary.id && contact.linkPrecedence === "primary") {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          linkPrecedence: "secondary",
          linkedId: primary.id
        }
      });
    }
  }

  // Check if new info needs new secondary
  const emailExists = email && existingContacts.some(c => c.email === email);
  const phoneExists = phoneNumber && existingContacts.some(c => c.phoneNumber === phoneNumber);

  if ((email && !emailExists) || (phoneNumber && !phoneExists)) {
    await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "secondary",
        linkedId: primary.id
      }
    });
  }

  // Fetch all linked contacts again
  const allContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: primary.id },
        { linkedId: primary.id }
      ]
    }
  });

  const emails = [
    primary.email,
    ...allContacts.filter(c => c.email && c.id !== primary.id).map(c => c.email)
  ].filter(Boolean);

  const phoneNumbers = [
    primary.phoneNumber,
    ...allContacts.filter(c => c.phoneNumber && c.id !== primary.id).map(c => c.phoneNumber)
  ].filter(Boolean);

  res.json({
    contact: {
      primaryContactId: primary.id,
      emails: [...new Set(emails)],
      phoneNumbers: [...new Set(phoneNumbers)],
      secondaryContactIds: allContacts
        .filter(c => c.linkPrecedence === "secondary")
        .map(c => c.id)
    }
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});