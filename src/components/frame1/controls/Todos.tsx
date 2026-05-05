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
import { format } from "date-fns";
import { Todo } from "@/lib/types";
import { CheckCircle2, XCircle, Plus } from "lucide-react";
import { useConfig } from "@/components/providers/ConfigProvider";

export default function Todos() {
  const { getTodos, updateTodos } = useConfig();
  const [todos, setTodos] = useState<Todo[]>(getTodos() || []);
  const [newTodo, setNewTodo] = useState<Omit<Todo, "id" | "completed">>({
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
    const todoToAdd = {
      id: Date.now(),
      ...newTodo,
      completed: false,
    };
    const updatedTodos = [...todos, todoToAdd];
    setTodos(updatedTodos);
    updateTodos(updatedTodos);
    setNewTodo({ title: "", priority: "Medium", date: "", time: "" });
    setError(null);
  };

  const toggleDone = (id: number) => {
    const updatedTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo,
    );
    setTodos(updatedTodos);
    updateTodos(updatedTodos);
  };

  const clearAll = () => {
    setTodos([]);
    updateTodos([]);
  };

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
                  addTodo();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <Input
                    placeholder="Task title"
                    value={newTodo.title}
                    onChange={(e) =>
                      setNewTodo({ ...newTodo, title: e.target.value })
                    }
                    aria-label="Task title"
                    onFocus={() => setError(null)}
                  />
                  {error && (
                    <p className="mt-1 text-sm text-red-600">{error}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={
                        newTodo.priority === "Low" ? "default" : "outline"
                      }
                      onClick={() =>
                        setNewTodo({ ...newTodo, priority: "Low" })
                      }
                      className="flex-1"
                    >
                      Low
                    </Button>
                    <Button
                      type="button"
                      variant={
                        newTodo.priority === "Medium" ? "default" : "outline"
                      }
                      onClick={() =>
                        setNewTodo({ ...newTodo, priority: "Medium" })
                      }
                      className="flex-1"
                    >
                      Medium
                    </Button>
                    <Button
                      type="button"
                      variant={
                        newTodo.priority === "High" ? "default" : "outline"
                      }
                      onClick={() =>
                        setNewTodo({ ...newTodo, priority: "High" })
                      }
                      className="flex-1"
                    >
                      High
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={newTodo.date}
                    onChange={(e) =>
                      setNewTodo({ ...newTodo, date: e.target.value })
                    }
                    aria-label="Task date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <Input
                    type="time"
                    value={newTodo.time}
                    onChange={(e) =>
                      setNewTodo({ ...newTodo, time: e.target.value })
                    }
                    aria-label="Task time"
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit">Add Task</Button>
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
                        todo.completed ? "line-through text-gray-400" : ""
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
                            ? "border-red-700 text-red-700 bg-red-200/10 backdrop-blur-sm border"
                            : todo.priority === "Medium"
                              ? "border-yellow-700 text-yellow-700 bg-yellow-200/10 backdrop-blur-sm border"
                              : "border-green-700 text-green-700 bg-green-200/10 backdrop-blur-sm border"
                        }
                      >
                        {todo.priority}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          todo.completed
                            ? "border-green-700 text-green-700"
                            : "border-gray-700 text-gray-700"
                        }
                      >
                        {todo.completed ? "Done" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleDone(todo.id)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label={
                      todo.completed ? "Mark as not done" : "Mark as done"
                    }
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
