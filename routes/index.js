var express = require('express');
var router = express.Router();
const Job = require("./job");
const User = require("./users");
const bcrypt = require("bcrypt");
const Chat = require("./chat")


router.get("/", async (req, res) => {
  try {
    const jobs = await Job.find().sort({ postedAt: -1 });
    res.render("index", { jobs, currentUser: req.session.user});
  } catch (err) {
    console.error(err);
    res.status(500).render("error", { message: "Server Error", error: err });
  }
});

router.get("/jobs/new", (req, res) => {
  res.render("job");
});

router.post("/jobs", async (req, res) => {
  const { title, company, location, salary, description } = req.body;
  await Job.create({ title,
     company: req.session.user.name,
      location,
       salary,
        description });
  res.redirect("/");
});

router.get("/register", (req, res) => {
  res.render("register");
});

router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).send("Email already registered");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await User.create({ name, email, password: hashedPassword, role });

  res.redirect("/login");
});

router.delete("/jobs/:id", isAdmin, async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({
      _id: req.params.id,
      company: req.session.user.name
    });
    if (!job) {
      return res.status(404).send("Job not found or you do not have permission to delete this job");
    }
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.status(500).render("error", { message: "Server Error", error: err });
  }
});

router.get("/login", (req, res) => {
  res.render("login");
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const existingUser = await User.findOne({ email });

  if (!existingUser) {
    return res.status(401).send("invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, existingUser.password);
  if (!isMatch) {
    return res.status(401).send("invalid credentials");
  }

req.session.user = {
  _id: existingUser._id,
  role: existingUser.role,
  name: existingUser.name
}

res.redirect("/")
});

function isAdmin(req, res, next){
  if(req.session.user?.role === 'admin') {
    return next()
  }
  res.status(403).send("acess Denied")
}

function isUser(req, res, next){
  if(req.session.user?.role === 'user') {
    return next()
  }
  res.status(403).send("acess denied")
}

router.post("/jobs/:id/apply", isUser, async (req, res) => {
  const jobId = req.params.id

  const currentUser = await User.findById(req.session.user._id)

  if(!currentUser) {
    return res.status(401).send("Invalid User")
  }

  if(currentUser.appliedJobs.includes(jobId)) {
    return res.send("Already applied")
  }

currentUser.appliedJobs.push(jobId)
await currentUser.save()

res.send("Applied succesful")
})

function isUser(req, res, next) {
  if (req.session.user && req.session.user.role === "user") {
    return next();
  }
  res.status(403).send("Only user can apply to jobs");
}

router.get("/profile", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  const currentUser = await User.findById(req.session.user._id).populate("appliedJobs");
  if (currentUser.role === 'user') {
    let chats = await Chat.find({ participants: currentUser._id })
      .populate("participants")
      .populate("messages.sender")
      .populate("jobId");
    return res.render("profile_jobseeker", { User: currentUser, chats });
  } else if (currentUser.role === 'admin') {
    const jobs = await Job.find({ company: currentUser.name });
    const jobResponses = await Promise.all(jobs.map(async job => {
      const applicants = await User.find({ appliedJobs: job._id });
      return { ...job.toObject(), applicants };
    }));
    return res.render("profile_employer", { User: currentUser, jobs: jobResponses });
  }
});


router.get("/chat/start/:userId/:jobId", async (req, res) => {
  if (req.session.user?.role !== "admin") {
    return res.status(403).send("Only admins can initiate chat");
  }

  const { userId, jobId } = req.params;
  const { message } = req.body;

  let chat = await Chat.findOne({ jobId, participants: { $all: [req.session.user._id, userId] } });

  if (!chat) {
    chat = new Chat({
      jobId,
      participants: [req.session.user._id, userId],
      messages: [{ sender: req.session.user._id, text: message }],
    });
  } else {
    chat.messages.push({ sender: req.session.user._id, text: message });
  }

  await chat.save();
  res.redirect(`/chat/${chat._id}`);
});

router.post("/chat/:chatId/reply", async (req, res) => {
  const chat = await Chat.findById(req.params.chatId); 

  if (
    !chat ||
    !chat.participants.some(p => p.toString() === req.session.user._id.toString()) 
  ) {
    return res.status(404).send("NOT ALLOWED TO REPLY");
  }

  chat.messages.push({
    sender: req.session.user._id,
    text: req.body.message
  });

  await chat.save();

  res.redirect(`/chat/${chat._id}`);
});

const mongoose = require("mongoose")

router.get("/chat/:chatId", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.chatId)) {
    return res.status(400).send("Invalid Chat ID");
  }

  const chat = await Chat.findById(req.params.chatId)
    .populate("participants")
    .populate("messages.sender"); // <-- also typo fix here

  if (!chat) return res.status(404).send("Chat not found");

  if (!chat.participants.map(p => p._id.toString()).includes(req.session.user._id.toString())) {
    return res.status(403).send("ACCESS DENIED");
  }

  res.render("chat", { chat, currentUser: req.session.user });
});



module.exports = router
