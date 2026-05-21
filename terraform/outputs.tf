output "instance_ip" {
  value       = linode_instance.cardventory.ipv4[0]
  description = "Public IP address of the Cardventory Linode instance"
}

output "ssh_command" {
  value       = "ssh root@${linode_instance.cardventory.ipv4[0]}"
  description = "SSH command to access the instance"
}
