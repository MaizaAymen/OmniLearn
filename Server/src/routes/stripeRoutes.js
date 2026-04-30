const path = require("path");
// Charger le .env du dossier Server/ explicitement, peu importe le cwd.
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const { User } = require("../models");
const { authenticate } = require("../middleware/Authmiddleware");

// Lazy init : on n'instancie Stripe qu'au premier appel, comme ça si la clé
// manque on a une erreur claire dans la requête, pas un crash au boot.
let _stripe = null;
const getStripe = () => {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set in .env");
    _stripe = Stripe(key);
  }
  return _stripe;
};
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Prix des plans (en centimes USD)
const PLANS = {
  pro: { name: "Pro Plan", amount: 999 },          // $9.99
  institution: { name: "Institution Plan", amount: 4999 }, // $49.99
};

router.use(authenticate);

// ÉTAPE 1 : créer une session de paiement Stripe Checkout.
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: "Invalid plan" });
    if (req.user.plan === "institution") {
      return res.status(400).json({ error: "You already have institution plan" });
    }

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: PLANS[plan].name },
            unit_amount: PLANS[plan].amount,
          },
          quantity: 1,
        },
      ],
      metadata: { userId: String(req.user.id), plan },
      success_url: `${CLIENT_URL}/profile?stripe_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/profile?stripe_cancelled=1`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// ÉTAPE 2 : après retour de Stripe, vérifier la session et upgrader le user.
router.get("/verify/:sessionId", async (req, res) => {
  try {
    const session = await getStripe().checkout.sessions.retrieve(req.params.sessionId);
    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not completed" });
    }
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    if (!userId || !PLANS[plan]) {
      return res.status(400).json({ error: "Invalid session metadata" });
    }
    if (String(req.user.id) !== String(userId)) {
      return res.status(403).json({ error: "Session does not belong to you" });
    }

    await User.update({ plan }, { where: { id: userId } });
    res.json({ message: `Upgraded to ${plan}`, plan });
  } catch (err) {
    console.error("verify session:", err);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

module.exports = router;
