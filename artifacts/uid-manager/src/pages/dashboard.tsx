import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListUids,
  getListUidsQueryKey,
  useAddUid,
  useRemoveUid,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Terminal, Shield, Trash2, Power, Server, Clock, Search, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const addUidSchema = z.object({
  uid: z.string().min(1, "UID is required"),
  days: z.coerce.number().min(1, "Must be at least 1 day").default(30),
  bluestack: z.boolean().default(true),
});

type AddUidValues = z.infer<typeof addUidSchema>;

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: listResponse, isLoading } = useListUids({
    query: { queryKey: getListUidsQueryKey() },
  });

  const addMutation = useAddUid();
  const removeMutation = useRemoveUid();

  const form = useForm<AddUidValues>({
    resolver: zodResolver(addUidSchema),
    defaultValues: {
      uid: "",
      days: 30,
      bluestack: true,
    },
  });

  const onSubmit = (values: AddUidValues) => {
    addMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          if (data.success) {
            toast({
              title: "ACCESS GRANTED",
              description: `UID ${values.uid} whitelisted successfully.`,
              variant: "default",
            });
            form.reset();
            queryClient.invalidateQueries({ queryKey: getListUidsQueryKey() });
          } else {
            toast({
              title: "OPERATION FAILED",
              description: data.message,
              variant: "destructive",
            });
          }
        },
        onError: () => {
          toast({
            title: "SYSTEM ERROR",
            description: "Failed to communicate with authorization server.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const onRemove = (uid: string) => {
    removeMutation.mutate(
      { data: { uid } },
      {
        onSuccess: (data) => {
          if (data.success) {
            toast({
              title: "ACCESS REVOKED",
              description: `UID ${uid} removed from whitelist.`,
              variant: "default",
            });
            queryClient.invalidateQueries({ queryKey: getListUidsQueryKey() });
          } else {
            toast({
              title: "OPERATION FAILED",
              description: data.message,
              variant: "destructive",
            });
          }
        },
        onError: () => {
          toast({
            title: "SYSTEM ERROR",
            description: "Failed to communicate with authorization server.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const uids = listResponse?.success ? listResponse.data : [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <h1 className="font-mono text-lg font-bold tracking-tight">NEXUS_CORE // UID_MGR</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              SYSTEM ONLINE
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-[350px_1fr] gap-8 items-start">
        {/* Left Column: Form */}
        <div className="space-y-6">
          <Card className="border-primary/20 bg-card/40 backdrop-blur shadow-2xl shadow-primary/5">
            <CardHeader className="pb-4">
              <CardTitle className="font-mono text-sm tracking-wider text-primary flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                NEW AUTHORIZATION
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                Register a new hardware identifier to the bypass network.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="uid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs text-muted-foreground uppercase">Target UID</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input 
                              placeholder="Enter UID..." 
                              className="font-mono pl-9 bg-background/50 border-border/50 focus-visible:ring-primary focus-visible:border-primary transition-all" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="font-mono text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs text-muted-foreground uppercase">Duration (Days)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input 
                              type="number" 
                              className="font-mono pl-9 bg-background/50 border-border/50 focus-visible:ring-primary transition-all" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="font-mono text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bluestack"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-md border border-border/50 bg-background/30 p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="font-mono text-xs text-foreground uppercase flex items-center gap-2">
                            <Server className="w-3.5 h-3.5" />
                            BlueStack Mode
                          </FormLabel>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            Enable emulator compatibility layer
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-primary"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full font-mono text-xs font-bold tracking-widest uppercase mt-2 group relative overflow-hidden" 
                    disabled={addMutation.isPending}
                  >
                    <div className="absolute inset-0 bg-primary/20 group-hover:translate-x-full transition-transform duration-500 ease-out" />
                    {addMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Power className="w-4 h-4 animate-spin" />
                        PROCESSING...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        AUTHORIZE ACCESS
                      </span>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card/40 border border-border/50 p-4 rounded-lg flex flex-col justify-center">
              <span className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">Active UIDs</span>
              <span className="text-2xl font-mono text-foreground font-bold">
                {isLoading ? <Skeleton className="h-8 w-12" /> : (uids?.length || 0)}
              </span>
            </div>
            <div className="bg-card/40 border border-border/50 p-4 rounded-lg flex flex-col justify-center">
              <span className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">Emulator Nodes</span>
              <span className="text-2xl font-mono text-primary font-bold">
                {isLoading ? <Skeleton className="h-8 w-12" /> : (uids?.filter(u => u.bluestack).length || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <h2 className="font-mono text-sm font-bold tracking-wider uppercase text-foreground">Active Authorizations</h2>
          </div>

          <div className="bg-card/30 border border-border/50 rounded-lg overflow-hidden backdrop-blur-sm">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full bg-border/20 rounded-md" />
                ))}
              </div>
            ) : uids?.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center text-muted-foreground">
                <Terminal className="w-8 h-8 mb-3 opacity-20" />
                <p className="font-mono text-sm">NO ACTIVE AUTHORIZATIONS FOUND</p>
                <p className="font-mono text-xs opacity-50 mt-1">System is currently empty</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Identifier</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Expiry</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Operator</th>
                      <th className="px-4 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {uids?.map((entry) => (
                      <tr key={entry.uid} className="border-b border-border/20 hover:bg-muted/20 transition-colors group">
                        <td className="px-4 py-3 font-bold text-foreground">
                          {entry.uid}
                        </td>
                        <td className="px-4 py-3">
                          {entry.bluestack ? (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] rounded-sm py-0 h-5 font-mono">
                              BS_ENABLED
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground border-border/50 text-[10px] rounded-sm py-0 h-5 font-mono">
                              STD_MODE
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(entry.expiry_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {entry.adder_name}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => onRemove(entry.uid)}
                            disabled={removeMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Revoke</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
