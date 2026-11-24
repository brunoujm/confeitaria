 'use client';
 
 import { Skeleton } from '@/components/ui/Skeleton';
 import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
 
 export function LoadingPostEditor() {
   return (
     <div className="flex h-screen bg-background">
       {/* Sidebar Skeleton */}
       <aside className="w-80 bg-card border-r flex flex-col hidden lg:flex">
         <div className="p-4 border-b">
           <Skeleton className="h-6 w-40" />
           <Skeleton className="h-4 w-60 mt-2" />
         </div>
         <nav className="flex-1 p-4 space-y-3">
           {[1, 2, 3, 4].map((i) => (
             <Skeleton key={i} className="h-12 w-full rounded-lg" />
           ))}
         </nav>
         <div className="p-4 border-t space-y-3">
           <Skeleton className="h-10 w-full" />
           <Skeleton className="h-10 w-full" />
           <Skeleton className="h-10 w-full" />
         </div>
       </aside>
 
       {/* Main Content Skeleton */}
       <main className="flex-1 flex flex-col overflow-hidden">
         <header className="border-b bg-card px-4 py-3">
           <div className="flex items-center gap-4">
             <Skeleton className="h-7 w-48" />
           </div>
         </header>
         <div className="flex-1 overflow-y-auto p-4 lg:p-6">
           <div className="max-w-3xl mx-auto space-y-6">
             <Card>
               <CardHeader>
                 <CardTitle>
                   <Skeleton className="h-6 w-40" />
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-6">
                 <div className="space-y-2">
                   <Skeleton className="h-4 w-24" />
                   <Skeleton className="h-10 w-full" />
                 </div>
                 <div className="space-y-2">
                   <Skeleton className="h-4 w-24" />
                   <Skeleton className="h-24 w-full" />
                 </div>
                 <div className="space-y-2">
                   <Skeleton className="h-4 w-24" />
                   <div className="flex flex-wrap gap-2">
                     {[1, 2, 3, 4, 5].map((i) => (
                       <Skeleton key={i} className="h-8 w-20 rounded-full" />
                     ))}
                   </div>
                 </div>
               </CardContent>
             </Card>
 
             <Card>
               <CardHeader>
                 <CardTitle>
                   <Skeleton className="h-6 w-32" />
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                   {[1, 2, 3, 4, 5].map((i) => (
                     <Skeleton key={i} className="h-24 w-full rounded-lg border-2" />
                   ))}
                 </div>
               </CardContent>
             </Card>
 
             <Card>
               <CardHeader>
                 <CardTitle>
                   <Skeleton className="h-6 w-32" />
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Skeleton className="h-4 w-24" />
                     <Skeleton className="h-10 w-full" />
                   </div>
                 </div>
               </CardContent>
             </Card>
           </div>
         </div>
       </main>
     </div>
   );
 }
