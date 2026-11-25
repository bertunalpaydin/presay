// Short texts to read aloud on the Practice page, written for this site.
// Each one is a real-life situation and is full of words that listeners often
// mishear. tests/practice-texts.test.mjs checks that every text marks enough
// words for every first language.

export const SITUATIONS = [
  { id: 'interview', name: 'Job interviews' },
  { id: 'presentation', name: 'Presentations' },
  { id: 'meeting', name: 'Meetings' },
  { id: 'calls', name: 'Phone and video calls' },
  { id: 'people', name: 'Meeting people' },
  { id: 'study', name: 'University' },
  { id: 'customers', name: 'Customers and sales' },
  { id: 'health', name: 'Health' },
  { id: 'travel', name: 'Travel' },
  { id: 'everyday', name: 'Everyday life' },
  { id: 'sounds', name: 'Tricky sounds' },
];

export const PRACTICE_TEXTS = [
  // Job interviews
  {
    id: 'interview-about-you',
    situation: 'interview',
    title: 'Tell me about yourself',
    text: `Thanks for inviting me today. I studied mechanical engineering, and for the past three years I have worked on electric vehicle batteries in a research lab. My job is to test new materials and write clear technical reports for the whole team. Outside work, I volunteer as a tutor for teenagers every Thursday evening. Now I am looking for a role where I can work more closely with customers.`,
  },
  {
    id: 'interview-strength',
    situation: 'interview',
    title: 'Your greatest strength',
    text: `I would say my greatest strength is staying calm when things go wrong. Last month our main supplier delayed a delivery by two weeks, just before a product launch. Instead of panicking, I rebuilt the schedule, asked the warehouse team for extra shifts and kept our clients informed every morning. We launched only three days late, and we kept every customer.`,
  },
  {
    id: 'interview-weakness',
    situation: 'interview',
    title: 'A weakness you are working on',
    text: `One weakness I am working on is public speaking. In my first year at work, I avoided presenting because I worried about my accent. So I joined a speaking club, and now I volunteer to lead our monthly review. I still prepare thoroughly and rehearse the difficult words, but I actually enjoy it now, and my feedback has improved a lot.`,
  },
  {
    id: 'interview-why',
    situation: 'interview',
    title: 'Why do you want this job?',
    text: `I have followed your company's work on renewable energy for several years, and I really admire how openly you share your research. This role combines the two things I enjoy most: working with data and explaining it to people who are not specialists. I believe my experience with weather models would be valuable to your forecasting team, and I would love to learn from them.`,
  },
  {
    id: 'interview-challenge',
    situation: 'interview',
    title: 'A difficult project',
    text: `The most difficult project I worked on was moving our customer records to a new system. We had almost three million records, and some of them were twenty years old. I wrote a script to find duplicates, tested everything in small batches and met the support team every morning to fix problems quickly. We finished a week early, and nothing was lost.`,
  },
  {
    id: 'interview-questions',
    situation: 'interview',
    title: 'Your questions for them',
    text: `Thank you, I do have a few questions. What does a typical week look like for someone in this role? How do you measure success in the first six months? Could you tell me a little about the team I would be working with? And finally, what do you personally enjoy most about working here? I would really like to understand the culture.`,
  },

  // Presentations
  {
    id: 'presentation-opening',
    situation: 'presentation',
    title: 'Opening a talk',
    text: `Good afternoon, everyone, and thank you for joining us. My name is Elena, and over the next twenty minutes I will walk you through our results from the third quarter. First, I will explain what changed in our sales. Then I will show you three charts that surprised us. Finally, I will share what we recommend for next year. Please keep your questions until the end.`,
  },
  {
    id: 'presentation-chart',
    situation: 'presentation',
    title: 'Explaining a chart',
    text: `As you can see on this slide, the number of online orders rose steadily throughout the year. The sharp increase in April was caused by our new delivery service. The orange line shows returns, which stayed below four percent, even during the busy holiday months. In other words, we sold much more without creating extra work for the warehouse.`,
  },
  {
    id: 'presentation-question',
    situation: 'presentation',
    title: 'Answering a question',
    text: `That is a really good question, thank you. The short answer is yes, the new system will work with older devices, but some features will be slower. We tested it on phones that are five years old, and the main screens still loaded in under three seconds. If you would like the full results, I am happy to send them after the session.`,
  },
  {
    id: 'presentation-closing',
    situation: 'presentation',
    title: 'Closing a talk',
    text: `To sum up, we have three priorities for next year: faster delivery, clearer pricing and better support for small businesses. None of this will happen without your help, so thank you for your hard work and your patience. The slides and the recording will be available on the shared drive this afternoon. I will stay for a few minutes if anyone would like to talk.`,
  },

  // Meetings
  {
    id: 'meeting-update',
    situation: 'meeting',
    title: 'A weekly update',
    text: `Here is a quick update from the design team. This week we finished the new checkout flow and shared it with three customers for feedback. Two of them found the payment step confusing, so we are simplifying it. Next week we will start on the settings page. The only problem is that we are still waiting for the final version of the brand guidelines.`,
  },
  {
    id: 'meeting-disagree',
    situation: 'meeting',
    title: 'Disagreeing politely',
    text: `I see your point, and I agree that speed matters. However, I am worried that launching on Monday leaves us no time to test the translation. Last year we rushed a release and spent the whole following month fixing small errors. Would it be possible to move the launch to Thursday? That gives us three extra days and a much safer release.`,
  },
  {
    id: 'meeting-chair',
    situation: 'meeting',
    title: 'Running a meeting',
    text: `Right, let's get started, as we only have thirty minutes. We have three items on the agenda today: the budget, the new office layout and the summer schedule. Could everyone keep their updates to two minutes, please? Valentina, would you like to begin with the budget? After that we will vote on the layout, and I will send a short summary straight after the meeting.`,
  },
  {
    id: 'meeting-help',
    situation: 'meeting',
    title: 'Asking for help',
    text: `Before we finish, I would like to ask for some help. Our team is responsible for the annual report, but two people are on holiday until the end of the month. If anyone has a few hours free this week, we really need someone to check the figures and read the final draft. Even one afternoon would make a huge difference. Thank you in advance.`,
  },

  // Phone and video calls
  {
    id: 'calls-appointment',
    situation: 'calls',
    title: 'Booking a repair',
    text: `Hello, I would like to book an appointment with an engineer, please. My washing machine stopped working on Wednesday, and it is leaking water onto the kitchen floor. I am available on Thursday or Friday morning, any time after eight. My address is on the account, and the best number to reach me is my mobile. Thank you very much.`,
  },
  {
    id: 'calls-video',
    situation: 'calls',
    title: 'A shaky video call',
    text: `Hi everyone, can you hear me clearly? Sorry, my video froze for a moment. The connection in this hotel is not very reliable, so I will switch my camera off while I share my screen. Let me know if the slides do not appear. If I drop out, please carry on without me, and I will rejoin as quickly as I can. Thanks for your patience.`,
  },
  {
    id: 'calls-support',
    situation: 'calls',
    title: 'Calling customer support',
    text: `Good morning, I am calling about my internet bill. This month I was charged twice for the same service, once on the third and again on the fifth. I have the reference numbers for both payments in front of me. Could you please verify the second payment, refund it and confirm everything by email? I would also like to know what went wrong, so that it won't happen again next month.`,
  },
  {
    id: 'calls-voicemail',
    situation: 'calls',
    title: 'Leaving a voicemail',
    text: `Hi Thomas, this is Priya from the accounts team, calling on Tuesday at about four thirty. I am following up on the invoice we sent last week, which is now overdue. It might simply be stuck in your approval system. Could you call me back when you have a moment, or reply to my email? My direct number is in the signature. Thanks, and have a good evening.`,
  },

  // Meeting people
  {
    id: 'people-event',
    situation: 'people',
    title: 'Introducing yourself at an event',
    text: `Hi, I don't think we've met. I'm Daniel, and I work as a software developer at a small health technology company. We build apps that help people manage their medication. This is my first time at this conference, actually. Which talks have you enjoyed so far? I thought the session on privacy this morning was really thoughtful.`,
  },
  {
    id: 'people-weather',
    situation: 'people',
    title: 'Talking about the weather',
    text: `It's freezing this morning, isn't it? The forecast said it would be warmer, but I had to scrape the ice off my car before work. Apparently it will be sunny and mild by Thursday, though. I'm hoping it stays dry for the weekend, because we're planning a long walk along the river with some friends. Do you have any plans?`,
  },
  {
    id: 'people-work',
    situation: 'people',
    title: 'Asking about someone’s work',
    text: `So, what do you do? Oh, that sounds fascinating. How did you get into architecture? I've always wondered how long it takes to design a whole building, from the first sketch to the finished structure. Do you mostly work on homes, or on larger projects like schools and hospitals? I'd love to hear about the most unusual project you've worked on.`,
  },
  {
    id: 'people-welcome',
    situation: 'people',
    title: 'Welcoming a new colleague',
    text: `Welcome to the team, Sofia. We're thrilled to have you. Let me show you around. The kitchen is through here, and there's usually fresh fruit on Wednesday mornings. Your desk is next to Martin's, by the window. He has worked here for twelve years, so he's the best person to ask about practically anything. Shall we grab a quick coffee before your first project meeting?`,
  },

  // University
  {
    id: 'study-extension',
    situation: 'study',
    title: 'Asking for more time',
    text: `Excuse me, do you have a few minutes? I wanted to speak to you about the deadline for the research essay. I've struggled with a chest infection for most of this month, and I have a note from my doctor. Would it be possible to have a short extension, perhaps until the thirteenth? I've already finished the literature review and the methodology, so I only need to complete the analysis and write the conclusion.`,
  },
  {
    id: 'study-seminar',
    situation: 'study',
    title: 'Speaking up in a seminar',
    text: `I'd like to add something to that point. The author argues that social media makes people more isolated, but the evidence she uses is mostly from surveys of teenagers. I think the picture is more complex. For example, many older people use video calls to stay in touch with their families. So perhaps it depends less on the technology and more on how we use it.`,
  },
  {
    id: 'study-thesis',
    situation: 'study',
    title: 'Presenting your thesis',
    text: `My thesis looks at how cities can reduce flooding without building expensive walls. I compared three areas that introduced green roofs, rain gardens and wider rivers over the last decade. The results show that these natural methods reduced flood damage by almost a third. In my final chapter, I discuss why some local governments are still reluctant to adopt them.`,
  },
  {
    id: 'study-group',
    situation: 'study',
    title: 'Planning a group project',
    text: `Shall we divide the work so that everyone has a clear task? I can write the methodology section, since I designed the questionnaire. Maybe Leo could handle the statistics, because he's the strongest at that. Then the two of you could work on the literature review together. If we each finish a draft by Friday, we'll have the whole weekend to review it.`,
  },

  // Customers and sales
  {
    id: 'customers-complaint',
    situation: 'customers',
    title: 'Handling a complaint',
    text: `I'm really sorry to hear that your order arrived damaged. That's definitely not the experience we want you to have. I've arranged for a replacement to be delivered on Thursday, free of charge, and our courier will collect the broken item at the same time. I've also added a ten percent discount to your account for your next purchase.`,
  },
  {
    id: 'customers-pitch',
    situation: 'customers',
    title: 'Pitching a product',
    text: `Our software helps small restaurants reduce food waste. It tracks what customers order, predicts how much fresh produce you will need each day, and warns you before ingredients expire. Our first customers have cut their waste by around thirty percent within three months. The setup takes less than an hour, and you can try it free for the first month.`,
  },
  {
    id: 'customers-delay',
    situation: 'customers',
    title: 'Explaining a delay',
    text: `Thank you for your patience. I've checked the tracking details, and unfortunately your parcel is still at our warehouse because of the strikes this week. I know this is frustrating, especially as it's a birthday present. We expect it to leave tomorrow morning, and I'll personally email you the new delivery date as soon as I have it.`,
  },
  {
    id: 'customers-price',
    situation: 'customers',
    title: 'Negotiating a price',
    text: `We really value working with you, and we'd like this partnership to continue. However, the price you've suggested is about fifteen percent below our costs. What we could offer instead is a smaller discount of five percent, together with free delivery and a longer payment period. Would that work for your budget? If so, I can prepare the contract by Wednesday.`,
  },

  // Health
  {
    id: 'health-doctor',
    situation: 'health',
    title: 'At the doctor’s',
    text: `I've had a sore throat and a high temperature for three days now. I've been taking something for the pain, which helps a little, but I'm still struggling to sleep at night. I'm also worried because I have an important exam on Thursday. Is there anything else I can take, or should I rest at home until the fever goes down?`,
  },
  {
    id: 'health-pharmacy',
    situation: 'health',
    title: 'At the pharmacy',
    text: `Hello, I have a prescription for these tablets, but I'd also like some advice. Can I take them with my usual allergy medicine, or should I wait a few hours between them? And is it better to take them before or after breakfast? I sometimes forget the evening one, so I want to make sure I understand the instructions properly.`,
  },
  {
    id: 'health-dentist',
    situation: 'health',
    title: 'Booking a check-up',
    text: `Hi, I'm calling to book a check-up with the dentist. It's been about eighteen months since my last visit, and one of my back teeth has been quite sensitive to cold drinks recently. Do you have anything available next week, preferably in the late afternoon? I work until four, but I can be there by four thirty.`,
  },
  {
    id: 'health-gym',
    situation: 'health',
    title: 'Joining a gym',
    text: `Hi, I'd like to join the gym, but I've never used weights before. Do you offer an introduction session with a trainer? I mainly want to build strength in my back and shoulders, because I sit at a desk all day. I'd also like to know how busy it gets in the evenings, and whether the swimming pool is included in the monthly membership.`,
  },

  // Travel
  {
    id: 'travel-hotel',
    situation: 'travel',
    title: 'Checking in at a hotel',
    text: `Good evening, I have a reservation for three nights under the name Kowalski. I booked a double room with breakfast included. Our flight was delayed, so I'm sorry we're arriving so late. Could you tell me what time breakfast is served, and whether there's somewhere safe to leave our bags on the last day? We don't fly back until the evening.`,
  },
  {
    id: 'travel-airport',
    situation: 'travel',
    title: 'A cancelled flight',
    text: `Excuse me, our connecting flight to Vienna has been cancelled, and the screen says to speak to someone at this desk. We were supposed to leave at twelve fifteen. Is there another flight today, or will we need to stay overnight? We're travelling with two young children, so we'd really appreciate a hotel near the airport if possible.`,
  },
  {
    id: 'travel-directions',
    situation: 'travel',
    title: 'Asking for directions',
    text: `Sorry to bother you, but could you tell me how to get to the science museum? My phone battery is completely flat, so I can't check the map. Is it within walking distance, or would it be quicker to take the underground? A student at the station told me to go straight down this street and take the third exit after the bridge, but I think I've walked past it.`,
  },
  {
    id: 'travel-car',
    situation: 'travel',
    title: 'Renting a car',
    text: `Hi, I'd like to collect the car I reserved online. Here's my driving licence and the booking reference. Could you explain the insurance options? I'd prefer full cover, because I'll be driving on narrow mountain roads. Also, does the car have automatic transmission? I'm not very comfortable with a manual gearbox, especially on steep hills.`,
  },

  // Everyday life
  {
    id: 'everyday-restaurant',
    situation: 'everyday',
    title: 'Ordering at a restaurant',
    text: `Could we have a table for three, please? Thanks. To start, I'll have the tomato soup, and my friend would like the grilled vegetables. For the main course, could I have the salmon without the sauce? I'm allergic to shellfish, so could you check that nothing contains it? And could we have a jug of tap water for the table, please?`,
  },
  {
    id: 'everyday-landlord',
    situation: 'everyday',
    title: 'Reporting a problem at home',
    text: `Hi, it's Wei from flat three. I'm writing because the heating in the living room hasn't worked properly since Wednesday. The radiator is warm at the top but completely cold at the bottom. I've already tried bleeding it, but nothing changed. Could someone come and have a look this week? I'm working from home, so I'm available most days.`,
  },
  {
    id: 'everyday-bank',
    situation: 'everyday',
    title: 'Opening a bank account',
    text: `Good morning, I'd like to open a savings account, please. I've just started a new job, and I want to put a small amount aside every month. Could you explain the difference between the fixed and the flexible accounts? I'd also like to know whether I can take money out at any time, or whether there's a penalty for early withdrawal.`,
  },
  {
    id: 'everyday-return',
    situation: 'everyday',
    title: 'Returning a jacket',
    text: `Hello, I bought this jacket here on Thursday the third, but it's a little too tight across the shoulders. I've kept the receipt, and I haven't worn it outside. Would it be possible to swap it for a bigger size, perhaps in a different colour? If not, I'd prefer a full refund, please. It's a beautiful jacket, and I'd love to wear it this winter, but it simply doesn't fit.`,
  },

  // Tricky sounds
  {
    id: 'sounds-th',
    situation: 'sounds',
    title: 'The two “th” sounds',
    text: `On the thirteenth of this month, three authors gathered at the theatre to talk about their methods. Although they rarely agree with each other, they all think that truth matters more than theory. Thank you to everyone who came through the storm on Thursday. Without the thoughtful questions from the audience, the evening would never have been worth it.`,
  },
  {
    id: 'sounds-w-v',
    situation: 'sounds',
    title: 'W and V',
    text: `Every winter, Victor and his wife travel west to visit their village. The views over the valley are wonderful, but the weather is very wet and windy. While Victor walks in the woods, Vanessa works on her novel in a quiet café. On the way back, they always buy fresh vegetables and a bottle of wine from the same family vineyard.`,
  },
  {
    id: 'sounds-r-l',
    situation: 'sounds',
    title: 'R and L',
    text: `Last February, Laura rarely left the library. She was writing a really long report about rural railways and the role they play in local life. Her colleague Larry brought her strong lemon tea every afternoon and reminded her to rest. When the report was finally released, readers loved how clearly it explained a problem that politicians had ignored for years.`,
  },
  {
    id: 'sounds-vowels',
    situation: 'sounds',
    title: 'Short and long vowels',
    text: `Please take a seat and fill in this form before you leave. If you live near the city, we can ship the cheese to your home this week. Mind the steps, as they are still slippery. My sister will check your details, and if everything looks fine, you should receive your full order in six days.`,
  },
  {
    id: 'sounds-endings',
    situation: 'sounds',
    title: 'Endings and clusters',
    text: `She asked for the latest texts, checked the facts and fixed the scripts in six weeks. The tasks were harder than expected, with strict deadlines and long lists of tests. Still, she helped her friends, answered their questions and walked home through the crowds each night, glad that the hardest months were finally behind her.`,
  },
  {
    id: 'sounds-stress',
    situation: 'sounds',
    title: 'Stress in long words',
    text: `Our development team is particularly comfortable with the new technology, but the responsibility for the documentation is still unclear. According to the latest statistics, our customers prefer the vegetarian menu, so we will advertise it specifically on Wednesday. Photography lovers can also book a guided tour of the photographic archive, at a very reasonable price.`,
  },
];
