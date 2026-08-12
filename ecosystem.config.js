module.exports = {
    apps: [
        {
            name: "frontend",
            cwd: "./frontend",
            script: "npm",
            args: "start",
            watch: false
        },
        {
            name: "backend",
            cwd: "./backend",
            script: "npm",
            args: "run dev",
            watch: false
        }
    ]
};