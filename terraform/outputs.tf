output "instance_ip" {
  value       = linode_instance.cardventory.ip_address
  description = "Public IP address of the Cardventory Linode instance"
}

output "ssh_command" {
  value       = "ssh root@${linode_instance.cardventory.ip_address}"
  description = "SSH command to access the instance"
}
