export interface Event {
  title: string;
  slug: string;
  description: string;
  excerpt: string;
  date: string;
  endDate: string;
  location: string;
  city: string;
  venue: string;
  image: string;
  imageAlt: string;
  speakers: string[];
  status: 'upcoming' | 'past' | 'cancelled';
  category: string;
  registrationUrl: string;
  seoTitle: string;
  seoDescription: string;
}

export interface Speaker {
  id: string;
  name: string;
  role: string;
  company: string;
  bio: string;
  image: string;
  imageAlt: string;
  linkedin: string;
  topics: string[];
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export interface Testimonial {
  id: string;
  author: string;
  role: string;
  company: string;
  photo: string;
  photoAlt: string;
  text: string;
  highlight: string;
}

export interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  category: string;
  image: string;
  imageAlt: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
}
