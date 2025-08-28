import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { CheckCircle2, XCircle, Plus } from "lucide-react";

const priorities = ["Low", "Medium", "High"];

type Todo = {
  id: number;
  title: string;
  priority: string;
  date: string;
  time: string;
  done: boolean;
  createdAt: Date;
};

export default function Todos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState<
    Omit<Todo, "id" | "done" | "createdAt">
  >({
    title: "",
    priority: "Medium",
    date: "",
    time: "",
  });
  const [error, setError] = useState<string | null>(null);

  const addTodo = () => {
    if (!newTodo.title.trim()) {
      setError("Task title is required");
      return;
    }
    setTodos([
      ...todos,
      {
        id: Date.now(),
        ...newTodo,
        done: false,
        createdAt: new Date(),
      },
    ]);
    setNewTodo({ title: "", priority: "Medium", date: "", time: "" });
    setError(null);
  };

  const toggleDone = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      )
    );
  };

  const clearAll = () => setTodos([]);

  return (
    <div className="p-6 flex justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold text-center">Tasks</h1>
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={clearAll}
            disabled={todos.length === 0}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Clear All
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-lg">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">
                  Create Task
                </DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTodo.title.trim()) return;
                  addTodo();
                }}
                className="space-y-4"
              >
                <div>
                  <Input
                    placeholder="Task title"
                    value={newTodo.title}
                    onChange={(e) =>
                      setNewTodo({ ...newTodo, title: e.target.value })
                    }
                    className="border-gray-300 focus:border-gray-500"
                    aria-label="Task title"
                    onFocus={() => setError(null)}
                  />
                  {error && (
                    <p className="mt-1 text-sm text-red-600">{error}</p>
                  )}
                </div>
                <Select
                  value={newTodo.priority}
                  onValueChange={(value) =>
                    setNewTodo({ ...newTodo, priority: value })
                  }
                >
                  <SelectTrigger
                    className="border-gray-300 focus:ring-2 focus:ring-gray-500"
                    aria-label="Task priority"
                  >
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  className="border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-500"
                  value={newTodo.date}
                  onChange={(e) =>
                    setNewTodo({ ...newTodo, date: e.target.value })
                  }
                  aria-label="Task date"
                />
                <Input
                  type="time"
                  className="border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-500"
                  value={newTodo.time}
                  onChange={(e) =>
                    setNewTodo({ ...newTodo, time: e.target.value })
                  }
                  aria-label="Task time"
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button
                      type="submit"
                      onClick={() => {
                        if (newTodo.title.trim()) addTodo();
                      }}
                    >
                      Add Task
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <ul className="space-y-3">
          {todos.length === 0 ? (
            <p className="text-center text-gray-500 text-sm">
              No tasks yet. Add a task to get started.
            </p>
          ) : (
            todos.map((todo) => (
              <li
                key={todo.id}
                className="rounded-lg border  p-4 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h2
                      className={`text-base font-medium ${
                        todo.done ? "line-through text-gray-400" : ""
                      }`}
                    >
                      {todo.title}
                    </h2>
                    {(todo.date || todo.time) && (
                      <p className="text-sm text-gray-500">
                        {todo.date && format(new Date(todo.date), "PPP")}
                        {todo.date && todo.time && " at "}
                        {todo.time}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Badge
                        variant="outline"
                        className={
                          todo.priority === "High"
                            ? "border-red-200 text-red-700"
                            : todo.priority === "Medium"
                            ? "border-yellow-200 text-yellow-700"
                            : "border-green-200 text-green-700"
                        }
                      >
                        {todo.priority}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          todo.done
                            ? "border-green-200 text-green-700"
                            : "border-gray-200 text-gray-700"
                        }
                      >
                        {todo.done ? "Done" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleDone(todo.id)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label={todo.done ? "Mark as not done" : "Mark as done"}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </Button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
