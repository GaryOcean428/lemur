import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MailIcon, Phone, MapPin, MessageSquare, Send } from "lucide-react";

export default function ContactPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      
      toast({
        title: "Message sent",
        description: "Thank you for your message. We'll respond as soon as possible.",
      });
    }, 1000);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 dark:text-white">Contact Us</h1>
        <p className="text-xl text-[hsl(var(--neutral-muted))] max-w-2xl mx-auto">
          Get in touch with the Lemur team. We're here to help with any questions or feedback.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
        <Card className="dark:bg-gray-800 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MailIcon className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
              Email Us
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[hsl(var(--neutral-muted))]">
              For general inquiries or support:
            </p>
            <a href="mailto:support@lemur-search.com" className="text-[hsl(var(--primary))] hover:underline mt-2 inline-block font-medium">
              support@lemur-search.com
            </a>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
              Call Us
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[hsl(var(--neutral-muted))]">
              Available Monday to Friday, 9am to 5pm AEST:
            </p>
            <p className="text-[hsl(var(--neutral))] font-medium mt-2 dark:text-white">
              +61 2 8888 8888
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
              Visit Us
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[hsl(var(--neutral-muted))]">
              Our headquarters:
            </p>
            <address className="not-italic text-[hsl(var(--neutral))] mt-2 dark:text-white">
              123 Tech Street<br />
              Sydney, NSW 2000<br />
              Australia
            </address>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <Card className="dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5 text-[hsl(var(--primary))]"/> 
                Send Us a Message
              </CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you as soon as possible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                      id="name" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com" 
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Inquiry</SelectItem>
                      <SelectItem value="support">Technical Support</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="business">Business Inquiry</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Your message..." 
                    rows={6} 
                    required 
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1 dark:text-white">How do I create an account?</h3>
                <p className="text-[hsl(var(--neutral-muted))]">Click the "Sign In" button in the top-right corner, then select "Create Account" and follow the instructions.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1 dark:text-white">Is Lemur free to use?</h3>
                <p className="text-[hsl(var(--neutral-muted))]">Yes, Lemur's basic search functionality is free. We offer premium features for subscribers.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1 dark:text-white">How does Lemur generate AI answers?</h3>
                <p className="text-[hsl(var(--neutral-muted))]">Lemur uses Groq's advanced Llama models to analyze web search results and create comprehensive answers with proper citations.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-1 dark:text-white">How can I report inaccurate information?</h3>
                <p className="text-[hsl(var(--neutral-muted))]">Use the feedback buttons on search results or contact us directly with details about the issue.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Additional Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li>
                  <a href="/help" className="text-[hsl(var(--primary))] hover:underline flex items-center">
                    <span className="mr-2">→</span>Help Center
                  </a>
                </li>
                <li>
                  <a href="/api" className="text-[hsl(var(--primary))] hover:underline flex items-center">
                    <span className="mr-2">→</span>API Documentation
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-[hsl(var(--primary))] hover:underline flex items-center">
                    <span className="mr-2">→</span>Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="text-[hsl(var(--primary))] hover:underline flex items-center">
                    <span className="mr-2">→</span>Terms of Service
                  </a>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
