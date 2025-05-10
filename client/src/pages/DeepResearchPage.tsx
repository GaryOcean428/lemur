import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Assuming you have a Textarea component
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress"; // Assuming a Progress component

interface ResearchProject {
  id: string;
  initialQuery: string;
  status: string;
  title: string;
  createdAt: any; // Firestore Timestamp or string
  updatedAt: any; // Firestore Timestamp or string
  results?: any; // Define more specifically based on actual result structure
  progress?: number; // Percentage, 0-100
  currentStep?: string; // Description of current activity
}

const DeepResearchPage: React.FC = () => {
  const { user, fetchUserStatus } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeProjects, setActiveProjects] = useState<ResearchProject[]>([]);
  const [projectIdToCheck, setProjectIdToCheck] = useState<string | null>(null);

  const canStartResearch = user?.tier === 'pro';

  // Fetch active/past research projects for the user
  const fetchUserProjects = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/orchestrator/projects', { // Assuming this endpoint exists
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch research projects.');
      }
      const projects: ResearchProject[] = await response.json();
      setActiveProjects(projects.map(p => ({...p, progress: p.status === 'completed' ? 100 : (p.progress || 0) })));
    } catch (error: any) {
      toast({ title: 'Error fetching projects', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchUserProjects();
  }, [fetchUserProjects]);

  // Periodically check status of ongoing projects
  useEffect(() => {
    if (!activeProjects.some(p => p.status !== 'completed' && p.status !== 'failed')) return;

    const intervalId = setInterval(async () => {
      const ongoingProjects = activeProjects.filter(p => p.status !== 'completed' && p.status !== 'failed');
      if (ongoingProjects.length === 0) return;

      // In a real app, you might fetch updates for all ongoing projects
      // For simplicity, let's imagine we check one by one or a specific one if selected
      // This is a simplified polling, consider WebSockets for real-time updates
      for (const project of ongoingProjects) {
        try {
          const token = await auth.currentUser?.getIdToken();
          const response = await fetch(`/api/orchestrator/project/${project.id}/status`, { // Assuming this endpoint exists
             headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const updatedProject: ResearchProject = await response.json();
            setActiveProjects(prev => prev.map(p => p.id === updatedProject.id ? {...updatedProject, progress: updatedProject.status === 'completed' ? 100 : (updatedProject.progress || p.progress || 0)} : p));
          }
        } catch (error) {
          console.error(`Error fetching status for project ${project.id}:`, error);
        }
      }
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(intervalId);
  }, [activeProjects]);


  const handleStartResearch = async () => {
    if (!query.trim()) {
      toast({ title: 'Query required', description: 'Please enter a research query.', variant: 'destructive' });
      return;
    }
    if (!canStartResearch) {
      toast({ title: 'Upgrade Required', description: 'Deep research is a Pro feature. Please upgrade your plan.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/deep-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start research project.');
      }
      toast({ title: 'Research Initiated', description: `Project for "${query}" started. ID: ${data.projectId}` });
      setQuery('');
      // Add to active projects optimistically or re-fetch
      setActiveProjects(prev => [...prev, { 
        id: data.projectId, 
        initialQuery: query, 
        status: 'starting', 
        title: `Deep Dive: ${query.substring(0,30)}...`, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(),
        progress: 0,
        currentStep: 'Initializing...'
      }]);
      fetchUserStatus(); // To update search counts if deep research counts towards it
    } catch (error: any) {
      toast({ title: 'Error starting research', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Initiate New Deep Research Project</CardTitle>
          <CardDescription>
            Enter your research query below. Deep research involves multiple agents and may take some time to complete.
            This feature is available for Pro tier users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your complex research query here..."
            rows={4}
            disabled={!canStartResearch || isLoading}
          />
          {!canStartResearch && user && (
            <p className="text-sm text-orange-600">Upgrade to Pro to use the Deep Research feature.</p>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleStartResearch} disabled={!canStartResearch || isLoading || !query.trim()}>
            {isLoading ? 'Processing...' : 'Start Deep Research'}
          </Button>
        </CardFooter>
      </Card>

      <h2 className="text-xl font-semibold">Active & Recent Research Projects</h2>
      {activeProjects.length === 0 && !isLoading && <p>No research projects found.</p>}
      {isLoading && activeProjects.length === 0 && <p>Loading projects...</p>}
      <div className="space-y-4">
        {activeProjects.map((project) => (
          <Card key={project.id} className="w-full">
            <CardHeader>
              <CardTitle>{project.title || project.initialQuery}</CardTitle>
              <CardDescription>ID: {project.id} | Status: <span className={`font-medium ${project.status === 'completed' ? 'text-green-600' : project.status === 'failed' ? 'text-red-600' : 'text-blue-600'}`}>{project.status}</span></CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">Initial Query: {project.initialQuery}</p>
              {(project.status !== 'completed' && project.status !== 'failed') && (
                <div className="space-y-1">
                  <Progress value={project.progress || 0} className="w-full" />
                  {project.currentStep && <p className="text-xs text-gray-500">Current step: {project.currentStep}</p>}
                </div>
              )}
              {project.status === 'completed' && project.results && (
                <div className="mt-2 p-2 bg-gray-50 rounded">
                  <h4 className="font-medium">Results:</h4>
                  <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(project.results, null, 2)}</pre>
                  {/* TODO: Better result rendering */}
                </div>
              )}
              {project.status === 'failed' && (
                <p className="text-sm text-red-500 mt-2">Research failed. Please check logs or contact support.</p>
              )}
            </CardContent>
            <CardFooter className="text-xs text-gray-500">
              <p>Created: {new Date(project.createdAt?.seconds ? project.createdAt.seconds * 1000 : project.createdAt).toLocaleString()}</p>
              <p className="ml-auto">Last Updated: {new Date(project.updatedAt?.seconds ? project.updatedAt.seconds * 1000 : project.updatedAt).toLocaleString()}</p>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DeepResearchPage;

